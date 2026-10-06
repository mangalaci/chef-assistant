// Recipe chunking: the hw2 "B" (section-based) strategy ported to TypeScript,
// with the hw2 "C" (fixed-size) strategy as a fallback for unstructured text.
// Pure functions only: no database, no OpenAI.

export type SectionType = 'ingredients' | 'steps' | 'notes' | 'other' | 'text';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type RecipeStats = {
  recipeName: string;
  subtitle: string | null;
  ingredientsCount: number;
  stepsCount: number;
  prepTime: string | null;
  prepMinutes: number | null;
  servings: string | null;
  difficulty: Difficulty;
  category: string;
  vegetarian: boolean;
  sources: string[];
};

export type Chunk = {
  chunkIndex: number;
  content: string;
  recipeName: string;
  sectionType: SectionType;
  category: string | null;
  difficulty: Difficulty | null;
  metadata: Record<string, unknown>;
};

const MAX_SECTION_CHARS = 1200;
const TARGET_PART_CHARS = 800;
const FALLBACK_MAX_CHARS = 500;
const FALLBACK_OVERLAP = 100;

// Copied from hw2 (CATEGORY_RULES). Order matters: earlier rules win.
const CATEGORY_RULES: Array<[string, string[]]> = [
  ['soup', ['soup', 'shorba', 'pho']],
  ['salad', ['salad']],
  ['drink', ['gin-and-tonic', 'tonic']],
  ['bread_dough', ['bread', 'tortilla', 'pizza', 'dough', 'pretzel', 'roti', 'pita', 'bagel', 'pancake']],
  ['main_dish', [
    'chicken', 'beef', 'pork', 'turkey', 'fish', 'tofu', 'carnitas', 'kebab',
    'kofte', 'schnitzel', 'nugget', 'rib', 'enchilada', 'taco', 'curry',
    'biryani', 'carne', 'chop',
  ]],
  ['sauce_condiment', [
    'sauce', 'salsa', 'dressing', 'dip', 'raita', 'mustard', 'hummus',
    'guasacaca', 'baba-ganoush', 'queso',
  ]],
  ['side_dish', [
    'rice', 'bean', 'potato', 'parsnip', 'cabbage', 'squash', 'green-bean',
    'masala', 'vada', 'samosa', 'gobi',
  ]],
];

// Not from hw2: a keyword heuristic so "vegetarian" questions can be answered
// with a metadata filter instead of vector similarity.
const MEAT_KEYWORDS = [
  'beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'ham', 'sausage',
  'salami', 'chorizo', 'prosciutto', 'fish', 'shrimp', 'prawn', 'anchov',
  'tuna', 'salmon', 'gelatin', 'lard', 'ribs', 'steak', 'carne',
];

type Section = { heading: string; body: string };

// --- Normalization --------------------------------------------------------

// CRLF -> LF, trailing whitespace removed, and "## Notes:" -> "## notes".
export const normalizeMarkdown = (input: string): string =>
  input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .map((line) => {
      const heading = line.match(/^##\s+(.+?)\s*:?$/);
      return heading ? `## ${heading[1].trim().toLowerCase()}` : line;
    })
    .join('\n');

// --- Metadata (hw2 extract_recipe_stats + parse_prep_minutes) --------------

const listItems = (body: string): string[] =>
  body
    .split('\n')
    .map((line) => line.match(/^\s*[*-]\s+(.+)$/)?.[1].trim())
    .filter((item): item is string => Boolean(item));

const countNumberedItems = (body: string): number =>
  body.split('\n').filter((line) => /^\s*\d+\.\s+/.test(line)).length;

// First time mention in minutes; for a range ("2-4 hours") the lower bound.
export const parsePrepMinutes = (text: string | null): number | null => {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\ban hour\b/.test(t)) return 60;
  const m = t.match(
    /(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?)/,
  );
  if (!m) return null;
  const value = parseFloat(m[1]);
  return m[2].startsWith('h') ? Math.trunc(value * 60) : Math.trunc(value);
};

export const difficultyFromSteps = (stepsCount: number): Difficulty =>
  stepsCount <= 3 ? 'easy' : stepsCount <= 7 ? 'medium' : 'hard';

export const classifyCategory = (filename: string): string => {
  const name = filename.toLowerCase().replace(/\.(md|txt)$/, '');
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => name.includes(kw))) return category;
  }
  return 'other';
};

const isVegetarian = (recipeName: string, ingredients: string[]): boolean => {
  if (/vegetarian|vegan/i.test(recipeName)) return true;
  const text = ingredients.join(' ').toLowerCase();
  return !MEAT_KEYWORDS.some((kw) => new RegExp(`\\b${kw}`).test(text));
};

// --- Parsing --------------------------------------------------------------

const cleanSubtitle = (line: string): string =>
  line.replace(/\*\*/g, '').replace(/^\((.*)\)$/, '$1').trim();

const titleFromFilename = (filename: string): string =>
  filename
    .replace(/\.(md|txt)$/i, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

const parseRecipe = (text: string) => {
  const lines = text.split('\n');
  const titleIndex = lines.findIndex((l) => /^#\s+\S/.test(l));
  if (titleIndex === -1) return null;

  const recipeName = lines[titleIndex].replace(/^#\s+/, '').trim();
  const preamble: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines.slice(titleIndex + 1)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { heading: heading[1], body: '' };
      sections.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    } else if (line.trim()) {
      preamble.push(line);
    }
  }
  for (const section of sections) section.body = section.body.trim();
  if (sections.length === 0) return null;

  const subtitle = preamble.length ? cleanSubtitle(preamble.join(' ')) : null;
  return { recipeName, subtitle, sections };
};

const sectionType = (heading: string): SectionType =>
  heading === 'ingredients' || heading === 'steps' || heading === 'notes'
    ? heading
    : 'other';

// Splits an oversized section at list-item boundaries into ~800 char parts,
// repeating the last item of a part at the start of the next one.
const splitSection = (body: string): string[] => {
  if (body.length <= MAX_SECTION_CHARS) return [body];

  const items = body.split('\n').filter((l) => l.trim());
  const parts: string[][] = [];
  let part: string[] = [];
  let size = 0;

  for (const item of items) {
    if (size + item.length > TARGET_PART_CHARS && part.length > 0) {
      parts.push(part);
      part = [part[part.length - 1]];
      size = part[0].length;
    }
    part.push(item);
    size += item.length + 1;
  }
  if (part.length) parts.push(part);
  return parts.map((p) => p.join('\n'));
};

// Context injection (hw2 lesson): every chunk names its recipe, so a lone
// "steps" chunk still says which dish it belongs to.
const chunkHeader = (stats: RecipeStats, label: string): string => {
  const name = stats.subtitle
    ? `${stats.recipeName} (${stats.subtitle})`
    : stats.recipeName;
  const info = [stats.prepTime, stats.servings].filter(Boolean).join(' · ');
  return info ? `${name} — ${label}\n${info}` : `${name} — ${label}`;
};

export const extractRecipeStats = (
  filename: string,
  parsed: NonNullable<ReturnType<typeof parseRecipe>>,
): RecipeStats => {
  const find = (h: string) => parsed.sections.find((s) => s.heading === h)?.body ?? '';
  const ingredients = listItems(find('ingredients'));
  const info = listItems(find('info'));
  const stepsCount = countNumberedItems(find('steps'));

  // As in hw2, the first info item is the time; the next one is the yield.
  const prepTime = info[0] ?? null;

  return {
    recipeName: parsed.recipeName,
    subtitle: parsed.subtitle,
    ingredientsCount: ingredients.length,
    stepsCount,
    prepTime,
    prepMinutes: parsePrepMinutes(prepTime),
    servings: info[1] ?? null,
    difficulty: difficultyFromSteps(stepsCount),
    category: classifyCategory(filename),
    vegetarian: isVegetarian(parsed.recipeName, ingredients),
    sources: listItems(find('based on')),
  };
};

// --- Strategies -----------------------------------------------------------

// hw2 "B": one chunk per section. "info" and "based on" do not become chunks
// (in hw2 they were short, noisy hits); their content goes into the header
// of every chunk and into the metadata instead.
const chunkRecipe = (
  filename: string,
  parsed: NonNullable<ReturnType<typeof parseRecipe>>,
): Chunk[] => {
  const stats = extractRecipeStats(filename, parsed);
  const chunks: Chunk[] = [];

  for (const section of parsed.sections) {
    if (section.heading === 'info' || section.heading === 'based on') continue;
    if (!section.body) continue;

    const type = sectionType(section.heading);
    const label = type === 'other' ? section.heading : type;
    const parts = splitSection(section.body);

    parts.forEach((body, partIndex) => {
      chunks.push({
        chunkIndex: chunks.length,
        content: `${chunkHeader(stats, label)}\n${body}`,
        recipeName: stats.recipeName,
        sectionType: type,
        category: stats.category,
        difficulty: stats.difficulty,
        metadata: {
          ...stats,
          heading: section.heading,
          ...(parts.length > 1 && { part: partIndex + 1, parts: parts.length }),
        },
      });
    });
  }
  return chunks;
};

// hw2 "C": fixed-size chunks (500 chars, 100 overlap) for text without
// recipe structure. Line breaks are preferred as cut points.
export const chunkFixedSize = (
  text: string,
  maxChars = FALLBACK_MAX_CHARS,
  overlap = FALLBACK_OVERLAP,
): string[] => {
  const clean = text.replace(/\n{3,}/g, '\n\n').trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      // Cut at a line break if there is one in the second half, else at a space.
      const lineBreak = clean.lastIndexOf('\n', end);
      const space = clean.lastIndexOf(' ', end);
      if (lineBreak > start + maxChars / 2) end = lineBreak;
      else if (space > start + maxChars / 2) end = space;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    // The overlap starts at a word boundary, not in the middle of a word.
    const overlapStart = clean.indexOf(' ', end - overlap);
    start = overlapStart > start && overlapStart < end ? overlapStart + 1 : end;
  }
  return chunks.filter(Boolean);
};

const chunkPlainText = (filename: string, text: string): Chunk[] => {
  const title = titleFromFilename(filename);
  return chunkFixedSize(text).map((body, i) => ({
    chunkIndex: i,
    content: `${title} — text\n${body}`,
    recipeName: title,
    sectionType: 'text',
    category: null,
    difficulty: null,
    metadata: { strategy: 'fixed-size' },
  }));
};

// Entry point: section-based chunks for recipe markdown, fixed-size chunks
// for anything without a "# title" and "## section" structure.
export const chunkDocument = (filename: string, content: string): Chunk[] => {
  const text = normalizeMarkdown(content);
  const parsed = parseRecipe(text);
  if (parsed) {
    const chunks = chunkRecipe(filename, parsed);
    if (chunks.length > 0) return chunks;
  }
  return chunkPlainText(filename, text);
};
