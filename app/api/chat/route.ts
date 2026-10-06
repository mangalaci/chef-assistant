import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
} from 'ai';

import { CHEF_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { tools } from '@/lib/ai/tools';
import { env } from '@/lib/env.mjs';

export const runtime = 'nodejs';
// Several tool rounds plus a reasoning model can take a while.
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai(env.CHAT_MODEL),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    system: CHEF_SYSTEM_PROMPT,
    tools,
    providerOptions: { openai: { reasoningEffort: env.REASONING_EFFORT } },
  });

  return result.toUIMessageStreamResponse();
}
