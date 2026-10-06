// Sends questions to the running app's /api/chat and prints the tool calls,
// the answer and the timings.
//
//   pnpm ask "Van valami gyors vacsora ötleted?" ["második kérdés" ...]

const BASE_URL = process.env.SEED_BASE_URL ?? 'http://localhost:3000';

export type AskResult = {
  question: string;
  answer: string;
  toolCalls: Array<{ name: string; input: unknown; resultCount?: number }>;
  firstTokenMs: number | null;
  totalMs: number;
};

// Parses the AI SDK UI message stream (server-sent events, one JSON per line).
export const ask = async (question: string): Promise<AskResult> => {
  const started = Date.now();
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: question }] }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const result: AskResult = { question, answer: '', toolCalls: [], firstTokenMs: null, totalMs: 0 };
  const byId = new Map<string, AskResult['toolCalls'][number]>();
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text-delta') {
        result.firstTokenMs ??= Date.now() - started;
        result.answer += event.delta;
      } else if (event.type === 'tool-input-available') {
        const call = { name: event.toolName, input: event.input };
        byId.set(event.toolCallId, call);
        result.toolCalls.push(call);
      } else if (event.type === 'tool-output-available') {
        const out = event.output;
        const list = out?.results ?? out?.recipes ?? out?.categories;
        const call = byId.get(event.toolCallId);
        if (call && Array.isArray(list)) call.resultCount = list.length;
      } else if (event.type === 'error') {
        throw new Error(event.errorText);
      }
    }
  }
  result.totalMs = Date.now() - started;
  return result;
};

const main = async () => {
  const questions = process.argv.slice(2);
  if (questions.length === 0) {
    console.error('Használat: pnpm ask "kérdés" ["kérdés" ...]');
    process.exit(1);
  }
  for (const q of questions) {
    const r = await ask(q);
    console.log(`\n### ${q}\n`);
    for (const t of r.toolCalls) {
      const count = t.resultCount === undefined ? '' : ` → ${t.resultCount} találat`;
      console.log(`- \`${t.name}\` ${JSON.stringify(t.input)}${count}`);
    }
    console.log(`\n${r.answer.trim()}\n`);
    console.log(`_(első token: ${r.firstTokenMs ?? '-'} ms, teljes: ${r.totalMs} ms)_`);
  }
};

if (process.argv[1]?.endsWith('ask.ts')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
