import type {
  PreTrainedModel,
  PreTrainedTokenizer,
} from '@huggingface/transformers';

// Cross-encoder reranking, the same model as in hw2
// (cross-encoder/ms-marco-MiniLM-L-6-v2, ONNX export by Xenova). It reads the
// query and a candidate text together and scores how well the text answers
// the query. The model is English-only, so callers pass an English query.
//
// The model is downloaded from Hugging Face on first use (~23 MB, cached in
// node_modules/@huggingface/transformers/.cache). If it cannot be loaded, the
// search keeps the vector order instead of failing.

const MODEL_ID = 'Xenova/ms-marco-MiniLM-L-6-v2';

type CrossEncoder = { tokenizer: PreTrainedTokenizer; model: PreTrainedModel };

let loading: Promise<CrossEncoder | null> | null = null;

const loadCrossEncoder = () => {
  loading ??= (async () => {
    try {
      const { AutoTokenizer, AutoModelForSequenceClassification } = await import(
        '@huggingface/transformers'
      );
      const started = Date.now();
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(MODEL_ID),
        AutoModelForSequenceClassification.from_pretrained(MODEL_ID, { dtype: 'q8' }),
      ]);
      console.info(`[rerank] ${MODEL_ID} loaded in ${Date.now() - started} ms`);
      return { tokenizer, model };
    } catch (error) {
      console.warn(`[rerank] model unavailable, keeping vector order:`, (error as Error).message);
      // Allow a later request to try again (e.g. once the network allows it).
      setTimeout(() => (loading = null), 60_000);
      return null;
    }
  })();
  return loading;
};

// Returns one relevance score per text (higher is better), or null when the
// model is unavailable. Scores are logits: only comparable within one query.
export const rerankScores = async (
  query: string,
  texts: string[],
): Promise<number[] | null> => {
  if (texts.length === 0) return [];
  const encoder = await loadCrossEncoder();
  if (!encoder) return null;

  const inputs = encoder.tokenizer(new Array(texts.length).fill(query), {
    text_pair: texts,
    padding: true,
    truncation: true,
  });
  const { logits } = await encoder.model(inputs);
  return Array.from(logits.data as Float32Array);
};
