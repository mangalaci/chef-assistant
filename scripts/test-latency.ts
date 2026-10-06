// End-to-end latency of /api/chat on the five required questions, printed as
// Markdown. Run it against a running app (`pnpm build && pnpm start`).
//
//   pnpm test:latency                       # RUNS=3 by default
//   SEED_BASE_URL=http://localhost:3001 LABEL=gpt-5 pnpm test:latency

import { ask } from './ask';
import { SUGGESTED_QUESTIONS } from '@/components/chat/suggested-questions';

const RUNS = Number(process.env.RUNS ?? 3);
const LABEL = process.env.LABEL ?? 'gpt-5-mini';

const stats = (xs: number[]) => ({
  min: Math.min(...xs),
  avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length),
  max: Math.max(...xs),
});
const sec = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',');

const main = async () => {
  const rows: string[] = [];
  const allFirst: number[] = [];
  const allTotal: number[] = [];

  for (const question of SUGGESTED_QUESTIONS) {
    const first: number[] = [];
    const total: number[] = [];
    const tools: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await ask(question);
      first.push(r.firstTokenMs ?? r.totalMs);
      total.push(r.totalMs);
      tools.push(r.toolCalls.length);
      console.error(`${LABEL} | ${question} | run ${i + 1}: ${r.totalMs} ms`);
    }
    allFirst.push(...first);
    allTotal.push(...total);
    const f = stats(first);
    const t = stats(total);
    rows.push(
      `| ${question} | ${sec(f.avg)} | ${sec(t.min)} / ${sec(t.avg)} / ${sec(t.max)} | ${stats(tools).min}–${stats(tools).max} |`,
    );
  }

  console.log(`## Válaszidő: ${LABEL} (${RUNS} futás kérdésenként)\n`);
  console.log('| kérdés | első token, átl. (mp) | teljes min / átl. / max (mp) | tool-hívás |');
  console.log('|---|---|---|---|');
  rows.forEach((r) => console.log(r));
  const f = stats(allFirst);
  const t = stats(allTotal);
  console.log(`| **összesen** | **${sec(f.avg)}** | **${sec(t.min)} / ${sec(t.avg)} / ${sec(t.max)}** | |`);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
