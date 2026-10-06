// Scale test: how storage, index build time and search latency grow with the
// number of chunks. The 254 real chunk vectors plus synthetic ones (mixes of
// two real vectors) go into a temporary table (embeddings_scale), up to ~10k rows, with the
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
const MAINTENANCE_WORK_MEM = process.env.MAINTENANCE_WORK_MEM ?? '256MB';

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',');
const toVector = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

// A synthetic chunk: a random mix of two real chunk vectors plus a little
// noise. (Plain noisy copies of one vector form tight clusters of 40 near-
// duplicates, which no HNSW graph with 16 links per node can navigate: that
// measured the test data, not the index.)
const synthetic = (base: number[][]) => {
  const a = base[Math.floor(Math.random() * base.length)];
  const b = base[Math.floor(Math.random() * base.length)];
  const w = 0.5 + Math.random() * 0.5;
  const out = a.map((x, i) => w * x + (1 - w) * b[i] + (Math.random() - 0.5) * 0.01);
  const norm = Math.sqrt(out.reduce((acc, x) => acc + x * x, 0));
  return out.map((x) => x / norm);
};

const percentile = (xs: number[], p: number) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const timeQueries = async (queries: number[][], exact: boolean, efSearch = 40) => {
  const times: number[] = [];
  const results: string[][] = [];
  for (const q of queries) {
    const vec = toVector(q);
    const started = performance.now();
    const rows = await db.transaction(async (tx) => {
      if (exact) await tx.execute(sql`SET LOCAL enable_indexscan = off`);
      else await tx.execute(sql.raw(`SET LOCAL hnsw.ef_search = ${efSearch}`));
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

  console.log(`## Skálázás (${base.length} valódi + szintetikus chunk-vektor, ${queries.length} lekérdezés, top ${K}, maintenance_work_mem ${MAINTENANCE_WORK_MEM})\n`);
  console.log('| chunk | tábla + index (MB) | ebből HNSW index (MB) | index építés (mp) | pontos keresés átl. / p95 (ms) | HNSW ef_search=40: átl. / p95 (ms), egyezés | HNSW ef_search=100: átl. / p95 (ms), egyezés |');
  console.log('|---|---|---|---|---|---|---|');

  await db.execute(sql`DROP TABLE IF EXISTS embeddings_scale`);
  await db.execute(sql`CREATE TABLE embeddings_scale (id serial PRIMARY KEY, embedding vector(1536) NOT NULL)`);
  try {
    let rows = 0;
    for (const size of SIZES) {
      while (rows < size) {
        const batch = [];
        for (let i = 0; i < 254 && rows < size; i++, rows++) {
          batch.push(sql`(${toVector(rows < base.length ? base[rows] : synthetic(base))}::vector)`);
        }
        await db.execute(sql`INSERT INTO embeddings_scale (embedding) VALUES ${sql.join(batch, sql`, `)}`);
      }

      await db.execute(sql`DROP INDEX IF EXISTS embeddings_scale_hnsw`);
      const buildStart = performance.now();
      await db.transaction(async (tx) => {
        // With the default 64 MB the 10k graph no longer fits in memory and
        // the build gets slower (pgvector NOTICE); the index stays the same.
        await tx.execute(sql.raw(`SET LOCAL maintenance_work_mem = '${MAINTENANCE_WORK_MEM}'`));
        await tx.execute(sql`CREATE INDEX embeddings_scale_hnsw ON embeddings_scale USING hnsw (embedding vector_cosine_ops)`);
      });
      const buildSec = (performance.now() - buildStart) / 1000;
      await db.execute(sql`ANALYZE embeddings_scale`);

      const [sizes] = await db.execute<{ total: string; idx: string }>(sql`
        SELECT pg_total_relation_size('embeddings_scale') AS total,
               pg_relation_size('embeddings_scale_hnsw') AS idx`);

      await timeQueries(queries.slice(0, 2), false); // warm the cache
      const exact = await timeQueries(queries, true);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      // Share of the exact top K that the approximate (HNSW) search also returns.
      const hnswCell = async (ef: number) => {
        const r = await timeQueries(queries, false, ef);
        const overlap =
          r.results.reduce((n, res, i) => n + res.filter((id) => exact.results[i].includes(id)).length, 0) /
          (queries.length * K);
        return `${avg(r.times).toFixed(1)} / ${percentile(r.times, 95).toFixed(1)}, ${Math.round(overlap * 100)}%`;
      };

      console.log(
        `| ${size} | ${mb(Number(sizes.total))} | ${mb(Number(sizes.idx))} | ${buildSec.toFixed(2).replace('.', ',')} | ` +
          `${avg(exact.times).toFixed(1)} / ${percentile(exact.times, 95).toFixed(1)} | ${await hnswCell(40)} | ${await hnswCell(100)} |`,
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
