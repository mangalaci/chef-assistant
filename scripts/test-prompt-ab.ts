// System prompt A/B: the starter's prompt vs. the Hungarian chef prompt on
// the five required questions, with the same model and the same tools.
// Prints a summary table and the full answers as Markdown.
//
//   pnpm test:prompts

import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';

import { SUGGESTED_QUESTIONS } from '@/components/chat/suggested-questions';
import { CHEF_SYSTEM_PROMPT, STARTER_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { tools } from '@/lib/ai/tools';
import { env } from '@/lib/env.mjs';

const PROMPTS = [
  { name: 'starter (angol)', system: STARTER_SYSTEM_PROMPT },
  { name: 'séf (magyar)', system: CHEF_SYSTEM_PROMPT },
];
// Questions without a matching recipe in the collection.
const NO_RECIPE = new Set([SUGGESTED_QUESTIONS[0], SUGGESTED_QUESTIONS[3]]);

const isHungarian = (text: string) =>
  (text.match(/[áéíóöőúüű]/gi)?.length ?? 0) / Math.max(text.length, 1) > 0.02;
const saysNotInCollection = (text: string) =>
  /nincs (a gyűjteményben|ilyen recept|benne)|nem szerepel|sorry, i don't know|not in (the|my) (collection|knowledge)/i.test(text);
const labelsGeneralKnowledge = (text: string) => /általános konyhai tudás/i.test(text);

type Run = { answer: string; tools: string[]; recipes: string[]; ms: number };

const run = async (system: string, question: string): Promise<Run> => {
  const started = Date.now();
  const r = await generateText({
    model: openai(env.CHAT_MODEL),
    system,
    prompt: question,
    tools,
    stopWhen: stepCountIs(6),
    providerOptions: { openai: { reasoningEffort: env.REASONING_EFFORT } },
  });
  const outputs = r.steps.flatMap((s) => s.toolResults.map((t) => t.output as Record<string, unknown>));
  const names = outputs.flatMap((o) => [
    ...((o.results as Array<{ recipeName?: string }>) ?? []).map((x) => x.recipeName),
    ...((o.recipes as Array<{ recipeName?: string }>) ?? []).map((x) => x.recipeName),
    (o.recipe as { recipeName?: string } | null)?.recipeName,
  ]);
  return {
    answer: r.text.trim(),
    tools: r.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)),
    recipes: [...new Set(names.filter((n): n is string => Boolean(n)))],
    ms: Date.now() - started,
  };
};

const main = async () => {
  const results: Array<{ question: string; prompt: string; run: Run }> = [];
  for (const question of SUGGESTED_QUESTIONS) {
    for (const p of PROMPTS) {
      results.push({ question, prompt: p.name, run: await run(p.system, question) });
      console.error(`${p.name} | ${question} done`);
    }
  }

  console.log(`## System prompt A/B (${env.CHAT_MODEL}, reasoningEffort ${env.REASONING_EFFORT})\n`);
  console.log('| kérdés | prompt | magyar | „nincs a gyűjteményben” | gyűjteményi recept a válaszban | jelölt általános tudás | tool-hívás | idő (mp) |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const { question, prompt, run: r } of results) {
    const cited = r.recipes.filter((n) => r.answer.includes(n)).length;
    const honest = NO_RECIPE.has(question) ? (saysNotInCollection(r.answer) ? 'igen' : '**nem**') : '–';
    console.log(
      `| ${question} | ${prompt} | ${isHungarian(r.answer) ? 'igen' : 'nem'} | ${honest} | ${cited} | ${labelsGeneralKnowledge(r.answer) ? 'igen' : 'nem'} | ${r.tools.length} | ${(r.ms / 1000).toFixed(1)} |`,
    );
  }

  console.log('\n## Teljes válaszok\n');
  for (const question of SUGGESTED_QUESTIONS) {
    console.log(`### ${question}\n`);
    for (const { prompt, run: r } of results.filter((x) => x.question === question)) {
      console.log(`**${prompt}** – tool-ok: ${r.tools.join(', ') || 'nincs'}\n`);
      console.log(r.answer.split('\n').map((l) => `> ${l}`).join('\n'));
      console.log();
    }
  }
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
