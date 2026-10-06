// Scale test: how storage, index build time and search latency grow with the
// number of chunks. The 254 real chunk vectors are copied with small random
// noise into a temporary table (embeddings_scale), up to ~10k rows, with the
// same HNSW index as the real table. Also measures the memory of this Node
// process with the reranker loaded. The temporary table is dropped at the end.
//
//   pnpm test:scale

import { sql } from 'drizzle-orm';

import { generateEmbedding } from '@/lib/ai/embedding';
import { searchRecipes } from '@/lib/ai/search';
import { db } from '@/lib/db';
import { POSITIVE_CASES } from './eval/cases';

const SIZES = [254, 2540, 10160];
const K = 20;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',');
const toVector = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

const noisy = (v: number[], scale: number) => {
  const out = v.map((x) => x + (Math.random() - 0.5) * scale);
  const norm = Math.sqrt(out.reduce((a, b) => a + b * b, 0));
  return out.map((x) => x / norm);
};

const percentile = (xs: number[], p: number) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const timeQueries = async (queries: number[][], exact: boolean) => {
  const times: number[] = [];
  const results: string[][] = [];
  for (const q of queries) {
    const vec = toVector(q);
    const started = performance.now();
    const rows = await db.transaction(async (tx) => {
      if (exact) await tx.execute(sql`SET LOCAL enable_indexscan = off`);
      else await tx.execute(sql`SET LOCAL hnsw.ef_search = 40`);
      return tx.execute<{ id: number }>(
        sql`SELECT id FROM embeddings_scale ORDER BY embedding <=> ${vec}::vector LIMIT ${K}`,
      );
    });
    times.push(performance.now() - started);
    results.push(rows.map((r) => String(r.id)));
  }
  return { times, results };
};

const main = async () => {
  const memStart = process.memoryUsage();
  const base = (await db.execute<{ embedding: string }>(sql`SELECT embedding::text FROM embeddings`)).map(
    (r) => JSON.parse(r.embedding) as number[],
  );
  const queries: number[][] = [];
  for (const c of POSITIVE_CASES) queries.push(await generateEmbedding(c.query));

  console.log(`## Skálázás (${base.length} valódi chunk-vektor zajjal sokszorozva, ${queries.length} lekérdezés, top ${K})\n`);
  console.log('| chunk | tábla + index (MB) | ebből HNSW index (MB) | index építés (mp) | HNSW átl. / p95 (ms) | pontos keresés átl. / p95 (ms) | HNSW találati egyezés |');
  console.log('|---|---|---|---|---|---|---|');

  await db.execute(sql`DROP TABLE IF EXISTS embeddings_scale`);
  await db.execute(sql`CREATE TABLE embeddings_scale (id serial PRIMARY KEY, embedding vector(1536) NOT NULL)`);
  try {
    let rows = 0;
    for (const size of SIZES) {
      while (rows < size) {
        const batch = [];
        for (let i = 0; i < 254 && rows < size; i++, rows++) {
          batch.push(sql`(${toVector(rows < base.length ? base[rows] : noisy(base[rows % base.length], 0.02))}::vector)`);
        }
        await db.execute(sql`INSERT INTO embeddings_scale (embedding) VALUES ${sql.join(batch, sql`, `)}`);
      }

      await db.execute(sql`DROP INDEX IF EXISTS embeddings_scale_hnsw`);
      const buildStart = performance.now();
      await db.execute(sql`CREATE INDEX embeddings_scale_hnsw ON embeddings_scale USING hnsw (embedding vector_cosine_ops)`);
      const buildSec = (performance.now() - buildStart) / 1000;
      await db.execute(sql`ANALYZE embeddings_scale`);

      const [sizes] = await db.execute<{ total: string; idx: string }>(sql`
        SELECT pg_total_relation_size('embeddings_scale') AS total,
               pg_relation_size('embeddings_scale_hnsw') AS idx`);

      await timeQueries(queries.slice(0, 2), false); // warm the cache
      const hnsw = await timeQueries(queries, false);
      const exact = await timeQueries(queries, true);
      const overlap =
        hnsw.results.reduce((n, r, i) => n + r.filter((id) => exact.results[i].includes(id)).length, 0) /
        (queries.length * K);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

      console.log(
        `| ${size} | ${mb(Number(sizes.total))} | ${mb(Number(sizes.idx))} | ${buildSec.toFixed(2).replace('.', ',')} | ` +
          `${avg(hnsw.times).toFixed(1)} / ${percentile(hnsw.times, 95).toFixed(1)} | ` +
          `${avg(exact.times).toFixed(1)} / ${percentile(exact.times, 95).toFixed(1)} | ${Math.round(overlap * 100)}% |`,
      );
    }
  } finally {
    await db.execute(sql`DROP TABLE IF EXISTS embeddings_scale`);
  }

  // Memory of the retrieval stack in this process: before and after the
  // reranker model is loaded and used.
  const memBefore = process.memoryUsage();
  await searchRecipes(POSITIVE_CASES[0].query, {});
  const memAfter = process.memoryUsage();
  console.log('\n## Memória (Node folyamat)\n');
  console.log('| állapot | RSS (MB) | heap (MB) |');
  console.log('|---|---|---|');
  console.log(`| indulás | ${mb(memStart.rss)} | ${mb(memStart.heapUsed)} |`);
  console.log(`| skálateszt után, reranker nélkül | ${mb(memBefore.rss)} | ${mb(memBefore.heapUsed)} |`);
  console.log(`| reranker betöltve, 1 keresés után | ${mb(memAfter.rss)} | ${mb(memAfter.heapUsed)} |`);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
