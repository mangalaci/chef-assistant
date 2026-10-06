import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';

const embeddingModel = openai.embedding('text-embedding-3-small');

// OpenAI accepts up to 2048 inputs per request; smaller batches keep each
// request well under the token limit and make a failure cheaper to retry.
const EMBEDDING_BATCH_SIZE = 96;

// Returns the vectors and the number of tokens OpenAI billed for them.
export const embedChunks = async (
  values: string[],
): Promise<{ vectors: number[][]; tokens: number }> => {
  const vectors: number[][] = [];
  let tokens = 0;
  for (let i = 0; i < values.length; i += EMBEDDING_BATCH_SIZE) {
    const { embeddings, usage } = await embedMany({
      model: embeddingModel,
      values: values.slice(i, i + EMBEDDING_BATCH_SIZE),
      maxRetries: 3,
    });
    vectors.push(...embeddings);
    tokens += usage.tokens;
  }
  return { vectors, tokens };
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};
