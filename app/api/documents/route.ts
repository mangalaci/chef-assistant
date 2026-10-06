import { fail, internalError, ok } from '@/lib/api/response';
import {
  DOCUMENT_STATUSES,
  listDocuments,
  type DocumentStatus,
} from '@/lib/services/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/documents[?status=uploaded|processing|processed|failed]
// Lists uploaded documents, newest first, without their content.
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get('status');
  if (status && !DOCUMENT_STATUSES.includes(status as DocumentStatus)) {
    return fail(400, 'VALIDATION_FAILED', `Ismeretlen státusz: ${status}.`, {
      allowed: DOCUMENT_STATUSES,
    });
  }

  try {
    const items = await listDocuments((status as DocumentStatus) ?? undefined);
    return ok({ documents: items, count: items.length });
  } catch (error) {
    return internalError('documents', error);
  }
}
