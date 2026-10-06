// Runs the chunker over data/recipes and prints statistics as Markdown, so the
// output can go straight into the README. Exits with 1 if an expectation fails.
//
//   pnpm chunk:preview

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chunkDocument, type Chunk } from '@/lib/ai/chunking';

const RECIPES_DIR = join(process.cwd(), 'data', 'recipes');
const MIN_CHUNK_CHARS = 50;

// hw2 strategy B results, for comparison (docs/hw2/hw2_rag_notebook.ipynb).
const HW2 = { chunks: 442, min: 4, max: 2967, avg: 269, other: 93 };

const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md')).sort();
const perFile = files.map((file) => ({
  file,
  chunks: chunkDocument(file, readFileSync(join(RECIPES_DIR, file), 'utf-8')),
}));
const chunks = perFile.flatMap((f) => f.chunks);
const lengths = chunks.map((c) => c.content.length);

const count = <T extends string>(values: T[]) =>
  Object.entries(
    values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);

const table = (header: string[], rows: Array<Array<string | number>>) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');

const recipeStats = perFile.map((f) => f.chunks[0].metadata);
const min = Math.min(...lengths);
const max = Math.max(...lengths);
const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

console.log('## Chunking statisztika\n');
console.log(
  table(
    ['', 'hw2 (B stratégia)', 'chef-assistant'],
    [
      ['Receptek', 85, files.length],
      ['Chunkok', HW2.chunks, chunks.length],
      ['Min. hossz (karakter)', HW2.min, min],
      ['Max. hossz (karakter)', HW2.max, max],
      ['Átlag hossz (karakter)', HW2.avg, avg],
      ["'other' chunk", HW2.other, chunks.filter((c) => c.sectionType === 'other').length],
    ],
  ),
);

console.log('\n### Szekciótípusok\n');
console.log(table(['sectionType', 'db'], count(chunks.map((c) => c.sectionType))));

const buckets = [50, 100, 200, 400, 800, 1200, Infinity];
console.log('\n### Hossz-hisztogram\n');
console.log(
  table(
    ['hossz', 'db'],
    buckets.map((limit, i) => {
      const from = i === 0 ? 0 : buckets[i - 1];
      const n = lengths.filter((l) => l >= from && l < limit).length;
      return [limit === Infinity ? `${from}+` : `${from}–${limit - 1}`, n];
    }),
  ),
);

console.log('\n### Metaadatok (receptenként)\n');
console.log(table(['category', 'db'], count(recipeStats.map((m) => String(m.category)))));
console.log();
console.log(table(['difficulty', 'db'], count(recipeStats.map((m) => String(m.difficulty)))));
console.log();
console.log(
  table(
    ['mező', 'kitöltve'],
    [
      ['prepMinutes', recipeStats.filter((m) => m.prepMinutes !== null).length],
      ['servings', recipeStats.filter((m) => m.servings !== null).length],
      ['subtitle', recipeStats.filter((m) => m.subtitle !== null).length],
      ['vegetarian = true', recipeStats.filter((m) => m.vegetarian).length],
    ],
  ),
);

const split = chunks.filter((c) => c.metadata.parts);
console.log(`\nFelvágott (>1200 karakteres) szekciók darabjai: ${split.length}`);

const show = (c: Chunk) =>
  `\n\`\`\`\n${c.content}\n\`\`\`\n(${c.sectionType}, ${c.content.length} karakter)`;
console.log('\n### Minta-chunkok');
console.log(show(perFile.find((f) => f.file === 'beef-tacos.md')!.chunks[0]));
console.log(show(perFile.find((f) => f.file === 'larb-gai.md')!.chunks[0]));

const plain = chunkDocument('kitchen-tips.txt', 'Plain text without headings. '.repeat(40));
console.log(`\nFallback (.txt, struktúra nélkül): ${plain.length} chunk, ` +
  `hosszak: ${plain.map((c) => c.content.length).join(', ')}`);

// --- Expectations -----------------------------------------------------------

const failures: string[] = [];
const short = chunks.filter((c) => c.content.length < MIN_CHUNK_CHARS);
if (short.length) failures.push(`${short.length} chunk rövidebb ${MIN_CHUNK_CHARS} karakternél`);
const unnamed = chunks.filter((c) => !c.content.startsWith(c.recipeName));
if (unnamed.length) failures.push(`${unnamed.length} chunk nem a recept nevével kezdődik`);
const colonHeadings = chunks.filter((c) => String(c.metadata.heading).endsWith(':'));
if (colonHeadings.length) failures.push(`${colonHeadings.length} kettőspontos fejléc maradt`);
const empty = perFile.filter((f) => f.chunks.length === 0);
if (empty.length) failures.push(`${empty.length} receptből nem lett chunk`);
if (plain.some((c) => c.sectionType !== 'text')) failures.push('a fallback nem fix méretű chunkokat adott');

console.log('\n### Ellenőrzés\n');
if (failures.length) {
  failures.forEach((f) => console.log(`- HIBA: ${f}`));
  process.exit(1);
}
console.log(`- Minden chunk legalább ${MIN_CHUNK_CHARS} karakter`);
console.log('- Minden chunk a recept nevével kezdődik');
console.log('- Nincs kettőspontos fejléc');
console.log('- Mind a 85 receptből lett chunk');
