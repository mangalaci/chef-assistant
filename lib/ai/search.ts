import { and, asc, cosineDistance, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { generateEmbedding } from '@/lib/ai/embedding';
import { rerankScores } from '@/lib/ai/rerank';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema/documents';
import { embeddings } from '@/lib/db/schema/embeddings';

// Retrieval for the chat tools: vector search -> similarity threshold ->
// cross-encoder rerank -> at most MAX_PER_RECIPE chunks per recipe.

const CANDIDATES = 20;
const RESULTS = 6;
const MAX_PER_RECIPE = 2;
// Below this cosine similarity a chunk counts as unrelated. The reranker
// cannot be used for this: its scores are only comparable within one query.
export const MIN_SIMILARITY = 0.3;

export type RecipeFilters = {
  vegetarian?: boolean;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  maxPrepMinutes?: number;
};

export type SearchHit = {
  recipeName: string;
  filename: string;
  sectionType: string;
  similarity: number;
  rerankScore: number | null;
  content: string;
};

const prepMinutes = sql<number | null>`(${embeddings.metadata}->>'prepMinutes')::int`;
const isVegetarian = sql<boolean>`(${embeddings.metadata}->>'vegetarian')::boolean`;

const filterConditions = (f: RecipeFilters): SQL[] => {
  const conditions: SQL[] = [eq(documents.status, 'processed')];
  if (f.vegetarian !== undefined) conditions.push(sql`${isVegetarian} = ${f.vegetarian}`);
  if (f.category) conditions.push(eq(embeddings.category, f.category));
  if (f.difficulty) conditions.push(eq(embeddings.difficulty, f.difficulty));
  if (f.maxPrepMinutes !== undefined) conditions.push(sql`${prepMinutes} <= ${f.maxPrepMinutes}`);
  return conditions;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

export const searchRecipes = async (
  query: string,
  options: RecipeFilters & { sectionTypes?: string[]; rerank?: boolean; limit?: number } = {},
) => {
  const started = Date.now();
  const vector = await generateEmbedding(query);
  const distance = cosineDistance(embeddings.embedding, vector);

  const conditions = filterConditions(options);
  if (options.sectionTypes?.length) {
    conditions.push(
      or(...options.sectionTypes.map((t) => eq(embeddings.sectionType, t)))!,
    );
  }

  const rows = await db
    .select({
      recipeName: embeddings.recipeName,
      filename: documents.filename,
      sectionType: embeddings.sectionType,
      content: embeddings.content,
      similarity: sql<number>`1 - (${distance})`,
    })
    .from(embeddings)
    .innerJoin(documents, eq(documents.id, embeddings.documentId))
    .where(and(...conditions))
    .orderBy(distance)
    .limit(CANDIDATES);

  const candidates = rows
    .map((r) => ({ ...r, recipeName: r.recipeName ?? r.filename, sectionType: r.sectionType ?? 'other', similarity: Number(r.similarity) }))
    .filter((r) => r.similarity >= MIN_SIMILARITY);

  const scores =
    options.rerank === false ? null : await rerankScores(query, candidates.map((c) => c.content));
  const ranked = candidates
    .map((c, i) => ({ ...c, rerankScore: scores ? scores[i] : null }))
    .sort((a, b) =>
      a.rerankScore !== null && b.rerankScore !== null
        ? b.rerankScore - a.rerankScore
        : b.similarity - a.similarity,
    );

  // Without this, one recipe's ingredients + steps + notes fill the list.
  const perRecipe = new Map<string, number>();
  const hits: SearchHit[] = [];
  for (const c of ranked) {
    const n = perRecipe.get(c.filename) ?? 0;
    if (n >= MAX_PER_RECIPE) continue;
    perRecipe.set(c.filename, n + 1);
    hits.push({
      ...c,
      similarity: round(c.similarity),
      rerankScore: c.rerankScore === null ? null : round(c.rerankScore),
    });
    if (hits.length === (options.limit ?? RESULTS)) break;
  }

  return {
    hits,
    topSimilarity: rows.length ? round(Number(rows[0].similarity)) : null,
    candidates: candidates.length,
    reranked: scores !== null,
    ms: Date.now() - started,
  };
};

// Metadata-only filter, one row per recipe. No embeddings involved: this is
// what answers "vegetarian" or "under 30 minutes" exactly.
export const filterRecipes = async (filters: RecipeFilters, limit = 30) => {
  const rows = await db
    .selectDistinctOn([embeddings.documentId], {
      recipeName: embeddings.recipeName,
      filename: documents.filename,
      category: embeddings.category,
      difficulty: embeddings.difficulty,
      prepTime: sql<string | null>`${embeddings.metadata}->>'prepTime'`,
      prepMinutes,
      vegetarian: isVegetarian,
      subtitle: sql<string | null>`${embeddings.metadata}->>'subtitle'`,
    })
    .from(embeddings)
    .innerJoin(documents, eq(documents.id, embeddings.documentId))
    .where(and(...filterConditions(filters)))
    .orderBy(embeddings.documentId, asc(embeddings.chunkIndex));

  rows.sort((a, b) => (a.recipeName ?? '').localeCompare(b.recipeName ?? ''));
  return { recipes: rows.slice(0, limit), total: rows.length };
};

// Full original recipe by file name ("beef-tacos" / "beef-tacos.md") or by a
// part of its title ("tacos"). Several matches -> the names, not the content.
export const getRecipe = async (nameOrFile: string) => {
  const term = nameOrFile.trim();
  const matches = await db
    .selectDistinct({
      recipeName: embeddings.recipeName,
      filename: documents.filename,
      content: documents.content,
    })
    .from(documents)
    .innerJoin(embeddings, eq(embeddings.documentId, documents.id))
    .where(
      or(
        eq(documents.filename, term),
        eq(documents.filename, `${term}.md`),
        ilike(embeddings.recipeName, `%${term}%`),
      ),
    )
    .limit(10);

  if (matches.length === 1) return { recipe: matches[0] };
  return {
    recipe: null,
    candidates: matches.map((m) => ({ recipeName: m.recipeName, filename: m.filename })),
  };
};

// Every recipe name per category: lets the model check what actually exists.
export const listRecipeCatalog = async () => {
  const rows = await db
    .selectDistinct({ recipeName: embeddings.recipeName, category: embeddings.category })
    .from(embeddings)
    .innerJoin(documents, eq(documents.id, embeddings.documentId))
    .where(eq(documents.status, 'processed'));

  const byCategory = new Map<string, string[]>();
  for (const r of rows) {
    const key = r.category ?? 'other';
    byCategory.set(key, [...(byCategory.get(key) ?? []), r.recipeName ?? '?']);
  }
  return {
    total: rows.length,
    categories: [...byCategory.entries()]
      .map(([category, recipes]) => ({ category, count: recipes.length, recipes: recipes.sort() }))
      .sort((a, b) => b.count - a.count),
  };
};
