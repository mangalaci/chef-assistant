import { z } from 'zod';

import { fail, internalError, ok } from '@/lib/api/response';
import { processDocuments } from '@/lib/services/documents';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(100).optional(),
});

// POST /api/process — { documentIds?: string[] }. Chunks and embeds the given
// documents, or all not-yet-processed ones when the body is empty.
export async function POST(req: Request) {
  const raw = await req.text();
  let json: unknown = {};
  if (raw.trim()) {
    try {
      json = JSON.parse(raw);
    } catch {
      return fail(400, 'BAD_REQUEST', 'A kérés törzse nem érvényes JSON.');
    }
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail(400, 'VALIDATION_FAILED', 'Érvénytelen kérés.', parsed.error.flatten().fieldErrors);
  }

  try {
    const started = Date.now();
    const { results, notFound } = await processDocuments(parsed.data.documentIds);
    const processed = results.filter((r) => r.status === 'processed').length;
    const chunks = results.reduce((n, r) => n + (r.status === 'processed' ? r.chunkCount : 0), 0);
    const ms = Date.now() - started;
    console.info(`[process] ${processed}/${results.length} processed, ${chunks} chunks, ${ms} ms`);

    if (results.length === 0 && notFound.length > 0) {
      return fail(404, 'NOT_FOUND', 'A megadott dokumentumok nem találhatók.', { notFound });
    }
    return ok({ results, notFound, processed, failed: results.length - processed, chunks, ms });
  } catch (error) {
    return internalError('process', error);
  }
}
