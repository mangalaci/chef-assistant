// Retrieval quality on scripts/eval/cases.ts, printed as Markdown.
//
//   pnpm test:retrieval
//
// Metrics are per recipe (chunks of the same recipe count once):
//   Hit@1     the first recipe is relevant
//   Recall@5  share of the relevant recipes among the first 5
//             (out of at most 5, so a case with 6 relevant recipes can reach 1)
//   MRR       1 / rank of the first relevant recipe
// Configurations: English or Hungarian query, with or without reranking, and
// the starter's sentence chunking vs. the section-based chunking.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { embedChunks, generateEmbedding } from '@/lib/ai/embedding';
import { rerankScores } from '@/lib/ai/rerank';
import { searchRecipes } from '@/lib/ai/search';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema/documents';
import { embeddings } from '@/lib/db/schema/embeddings';
import { eq } from 'drizzle-orm';
import { NEGATIVE_CASES, POSITIVE_CASES, type RetrievalCase } from './eval/cases';

const stem = (file: string) => file.replace(/\.(md|txt)$/, '');
const uniq = (xs: string[]) => [...new Set(xs)];

const score = (ranked: string[], relevant: string[]) => {
  const top5 = ranked.slice(0, 5);
  const firstHit = ranked.findIndex((r) => relevant.includes(r));
  return {
    hit1: relevant.includes(ranked[0]) ? 1 : 0,
    recall5: top5.filter((r) => relevant.includes(r)).length / Math.min(5, relevant.length),
    mrr: firstHit === -1 ? 0 : 1 / (firstHit + 1),
  };
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (n: number) => n.toFixed(2);

type Row = { id: string; hit1: number; recall5: number; mrr: number; top: string[]; ms: number };

const runConfig = async (lang: 'en' | 'hu', rerank: boolean): Promise<Row[]> => {
  const rows: Row[] = [];
  for (const c of POSITIVE_CASES) {
    const started = Date.now();
    const r = await searchRecipes(lang === 'en' ? c.query : c.question, { rerank, limit: 10 });
    const ranked = uniq(r.hits.map((h) => stem(h.filename)));
    rows.push({ id: c.id, ...score(ranked, c.relevant), top: ranked.slice(0, 3), ms: Date.now() - started });
  }
  return rows;
};

// --- Chunking A/B: in-memory vector search over two chunk sets ------------

const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / Math.sqrt(na * nb);
};

type Indexed = { recipe: string; name: string; text: string; vector: number[]; length: number };


// Vector top 20 chunks, optionally reranked; returns recipes in order and the
// first chunk (to check whether it names its recipe).
const rankChunks = async (index: Indexed[], q: number[], query: string, rerank: boolean) => {
  let top = index
    .map((e) => ({ e, s: cosine(e.vector, q) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)
    .map((x) => x.e);
  if (rerank) {
    const scores = await rerankScores(query, top.map((e) => e.text));
    if (scores) top = top.map((e, i) => ({ e, s: scores[i] })).sort((a, b) => b.s - a.s).map((x) => x.e);
  }
  return { recipes: uniq(top.map((e) => e.recipe)), first: top[0] };
};

// The starter's generateChunks: split on every "." (also "1.5" and "1.").
const naiveChunks = (text: string) => text.trim().split('.').filter((c) => c !== '');

const chunkingAB = async (cases: RetrievalCase[]) => {
  const dir = join(process.cwd(), 'data', 'recipes');
  const naive: Array<{ recipe: string; name: string; text: string }> = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, f), 'utf-8');
    const name = text.match(/^#\s+(.+?)\s*$/m)?.[1] ?? stem(f);
    for (const t of naiveChunks(text)) naive.push({ recipe: stem(f), name, text: t });
  }
  const { vectors, tokens } = await embedChunks(naive.map((n) => n.text));
  const naiveIndex = naive.map((n, i) => ({ ...n, vector: vectors[i], length: n.text.length }));

  const sectionRows = await db
    .select({ filename: documents.filename, name: embeddings.recipeName, vector: embeddings.embedding, content: embeddings.content })
    .from(embeddings)
    .innerJoin(documents, eq(documents.id, embeddings.documentId));
  const sectionIndex = sectionRows.map((r) => ({
    recipe: stem(r.filename), name: r.name ?? '', text: r.content, vector: r.vector, length: r.content.length,
  }));

  type Result = ReturnType<typeof score> & { named: number };
  const variants = { naive: naiveIndex, section: sectionIndex };
  const result: Record<string, Result[]> = {};
  for (const c of cases) {
    const q = await generateEmbedding(c.query);
    for (const [key, index] of Object.entries(variants)) {
      for (const rerank of [false, true]) {
        const r = await rankChunks(index, q, c.query, rerank);
        const k = `${key}${rerank ? '+rerank' : ''}`;
        (result[k] ??= []).push({ ...score(r.recipes, c.relevant), named: r.first.text.includes(r.first.name) ? 1 : 0 });
      }
    }
  }
  return {
    result,
    tokens,
    lengths: { naive: naiveIndex.map((e) => e.length), section: sectionIndex.map((e) => e.length) },
  };
};

// --- Report -------------------------------------------------------------------

const main = async () => {
  await searchRecipes('warm up', {}); // load the reranker before timing

  const configs = [
    { name: 'angol lekérdezés, vektor', lang: 'en' as const, rerank: false },
    { name: 'angol lekérdezés, vektor + rerank', lang: 'en' as const, rerank: true },
    { name: 'magyar lekérdezés, vektor', lang: 'hu' as const, rerank: false },
    { name: 'magyar lekérdezés, vektor + rerank', lang: 'hu' as const, rerank: true },
  ];
  const results: Record<string, Row[]> = {};
  for (const cfg of configs) results[cfg.name] = await runConfig(cfg.lang, cfg.rerank);

  console.log(`## Keresési pontosság (${POSITIVE_CASES.length} pozitív eset)\n`);
  console.log('| konfiguráció | Hit@1 | Recall@5 | MRR | átl. idő (ms) |');
  console.log('|---|---|---|---|---|');
  for (const cfg of configs) {
    const rows = results[cfg.name];
    console.log(`| ${cfg.name} | ${f2(mean(rows.map((r) => r.hit1)))} | ${f2(mean(rows.map((r) => r.recall5)))} | ${f2(mean(rows.map((r) => r.mrr)))} | ${Math.round(mean(rows.map((r) => r.ms)))} |`);
  }

  const en = results[configs[0].name];
  const enR = results[configs[1].name];
  console.log('\n### Esetenként (angol lekérdezés)\n');
  console.log('| eset | lekérdezés | MRR vektor | MRR rerank | top 3 (rerank) |');
  console.log('|---|---|---|---|---|');
  POSITIVE_CASES.forEach((c, i) => {
    console.log(`| ${c.id}${c.required ? ' *' : ''} | ${c.query} | ${f2(en[i].mrr)} | ${f2(enR[i].mrr)} | ${enR[i].top.join(', ')} |`);
  });
  console.log('\n\\* a feladatkiírás kötelező tesztkérdése');

  console.log('\n## Negatív esetek (nincs rá recept)\n');
  const positiveTop: number[] = [];
  for (const c of POSITIVE_CASES) positiveTop.push((await searchRecipes(c.query, { rerank: false })).topSimilarity ?? 0);
  console.log('| eset | lekérdezés | legjobb hasonlóság | legjobb találat |');
  console.log('|---|---|---|---|');
  const negativeTop: number[] = [];
  for (const c of NEGATIVE_CASES) {
    const r = await searchRecipes(c.query, { rerank: false });
    negativeTop.push(r.topSimilarity ?? 0);
    console.log(`| ${c.id}${c.required ? ' *' : ''} | ${c.query} | ${r.topSimilarity} | ${r.hits[0]?.recipeName ?? '–'} |`);
  }
  const negativeMax = Math.max(...negativeTop);
  const positiveMin = Math.min(...positiveTop);
  console.log(`\nÖsszevetésül a pozitív esetek legjobb hasonlósága: ${f2(positiveMin)}–${f2(Math.max(...positiveTop))} ` +
    `(átlag ${f2(mean(positiveTop))}). ` +
    (negativeMax >= positiveMin
      ? 'A két tartomány átfed, ezért a „nincs találat” döntést nem lehet egy küszöbre bízni.'
      : `A legjobb negatív (${f2(negativeMax)}) és a leggyengébb pozitív (${f2(positiveMin)}) között csak ` +
        `${f2(positiveMin - negativeMax)} a különbség: erre egy küszöböt építeni törékeny lenne, ezért a relevanciát a modell ítéli meg.`));

  console.log('\n## Chunking: a starter pont szerinti darabolása vs. szekció-alapú\n');
  const ab = await chunkingAB(POSITIVE_CASES);
  const len = (xs: number[]) => `${Math.min(...xs)} / ${Math.round(mean(xs))} / ${Math.max(...xs)}`;
  console.log('| chunking | keresés | chunk | hossz min / átl. / max | Hit@1 | Recall@5 | MRR | 1. chunk megnevezi a receptet |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [name, key] of [['starter: split(".")', 'naive'], ['szekció-alapú (2. fázis)', 'section']] as const) {
    const l = ab.lengths[key];
    for (const rerank of [false, true]) {
      const r = ab.result[`${key}${rerank ? '+rerank' : ''}`];
      console.log(`| ${name} | ${rerank ? 'vektor + rerank' : 'vektor'} | ${l.length} | ${len(l)} | ${f2(mean(r.map((x) => x.hit1)))} | ${f2(mean(r.map((x) => x.recall5)))} | ${f2(mean(r.map((x) => x.mrr)))} | ${Math.round(mean(r.map((x) => x.named)) * 100)}% |`);
    }
  }
  console.log(`\n(Memóriában, ugyanazzal a 20 jelölt + rerank logikával, angol lekérdezéssel. A pont szerinti chunkok embeddingje ${ab.tokens} token volt.)`);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
