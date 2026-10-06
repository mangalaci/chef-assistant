// Downloads the cross-encoder model into the transformers.js cache (used by
// the Dockerfile, so the container does not need Hugging Face at runtime).

import { rerankScores } from '@/lib/ai/rerank';

rerankScores('test', ['test']).then((scores) => {
  if (!scores) {
    console.error('A reranker modell letöltése nem sikerült.');
    process.exit(1);
  }
  console.log('Reranker modell letöltve.');
});
