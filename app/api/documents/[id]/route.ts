import { fail, internalError, ok } from '@/lib/api/response';
import { deleteDocument } from '@/lib/services/documents';

export const runtime = 'nodejs';

// DELETE /api/documents/:id — deletes the document and, via ON DELETE
// CASCADE, all of its chunks. In Next.js 14 `params` is a plain object.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const deleted = await deleteDocument(params.id);
    if (!deleted) {
      return fail(404, 'NOT_FOUND', `Nincs ilyen dokumentum: ${params.id}.`);
    }
    console.info(`[documents] deleted ${deleted.filename} (${deleted.chunkCount} chunks)`);
    return ok({ deleted });
  } catch (error) {
    return internalError('documents', error);
  }
}
