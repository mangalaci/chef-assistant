// Loads data/recipes into the running app through its own API
// (POST /api/upload, then POST /api/process), in batches of 20, and prints
// timings and the embedding cost as Markdown.
//
//   pnpm dev            # in another terminal
//   pnpm seed           # or: SEED_BASE_URL=http://localhost:3000 pnpm seed

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.SEED_BASE_URL ?? 'http://localhost:3000';
const RECIPES_DIR = join(process.cwd(), 'data', 'recipes');
const BATCH_SIZE = 20;
// text-embedding-3-small list price, USD per 1M tokens.
const USD_PER_MILLION_TOKENS = 0.02;

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

type UploadData = {
  results: Array<{ filename: string; status: string; id?: string; error?: string }>;
};
type ProcessData = {
  results: Array<{ filename: string; status: string; error?: string }>;
  processed: number;
  failed: number;
  chunks: number;
  tokens: number;
};

const call = async <T>(path: string, init: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) throw new Error(`${path}: HTTP ${res.status} ${body.error.message}`);
  return body.data;
};

const main = async () => {
  try {
    await fetch(`${BASE_URL}/api/documents`);
  } catch {
    console.error(`Az app nem érhető el itt: ${BASE_URL}. Előbb indítsd el: pnpm dev`);
    process.exit(1);
  }

  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.md')).sort();
  const rows: string[] = [];
  const totals = { uploaded: 0, processed: 0, failed: 0, chunks: 0, tokens: 0, uploadMs: 0, processMs: 0 };
  const errors: string[] = [];
  const started = Date.now();

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const form = new FormData();
    for (const file of batch) {
      const bytes = readFileSync(join(RECIPES_DIR, file));
      form.append('files', new File([bytes], file, { type: 'text/markdown' }));
    }

    let t = Date.now();
    const upload = await call<UploadData>('/api/upload', { method: 'POST', body: form });
    const uploadMs = Date.now() - t;
    const ids = upload.results.flatMap((r) => (r.id ? [r.id] : []));
    upload.results
      .filter((r) => r.status === 'rejected')
      .forEach((r) => errors.push(`${r.filename}: ${r.error}`));

    t = Date.now();
    const processed = await call<ProcessData>('/api/process', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentIds: ids }),
    });
    const processMs = Date.now() - t;
    processed.results
      .filter((r) => r.status === 'failed')
      .forEach((r) => errors.push(`${r.filename}: ${r.error}`));

    totals.uploaded += ids.length;
    totals.processed += processed.processed;
    totals.failed += processed.failed;
    totals.chunks += processed.chunks;
    totals.tokens += processed.tokens;
    totals.uploadMs += uploadMs;
    totals.processMs += processMs;

    const batchNo = i / BATCH_SIZE + 1;
    rows.push(
      `| ${batchNo} | ${batch.length} | ${processed.processed} | ${processed.chunks} | ${processed.tokens} | ${uploadMs} | ${processMs} |`,
    );
    console.error(`batch ${batchNo}: ${processed.processed}/${batch.length} kész`);
  }

  const totalMs = Date.now() - started;
  const cost = (totals.tokens / 1_000_000) * USD_PER_MILLION_TOKENS;

  console.log('## Seed eredmény\n');
  console.log('| batch | fájl | feldolgozva | chunk | token | upload (ms) | process (ms) |');
  console.log('|---|---|---|---|---|---|---|');
  rows.forEach((r) => console.log(r));
  console.log(
    `| **össz.** | **${files.length}** | **${totals.processed}** | **${totals.chunks}** | **${totals.tokens}** | **${totals.uploadMs}** | **${totals.processMs}** |`,
  );
  console.log(`\n- Teljes idő: ${(totalMs / 1000).toFixed(1)} mp ` +
    `(${Math.round(totalMs / files.length)} ms / recept)`);
  console.log(`- Embedding költség: ${totals.tokens} token ≈ $${cost.toFixed(5)} ` +
    `(text-embedding-3-small, $${USD_PER_MILLION_TOKENS}/1M token)`);

  if (errors.length || totals.failed) {
    console.log('\n### Hibák\n');
    errors.forEach((e) => console.log(`- ${e}`));
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
