import { fail, internalError, ok } from '@/lib/api/response';
import {
  MAX_FILES_PER_UPLOAD,
  uploadDocuments,
} from '@/lib/services/documents';

export const runtime = 'nodejs';

// POST /api/upload — multipart/form-data, one or more files in the "files"
// (or "file") field. Stores them with status "uploaded"; processing is a
// separate step (POST /api/process).
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'BAD_REQUEST', 'A kérés nem multipart/form-data.');
  }

  const files = [...form.getAll('files'), ...form.getAll('file')].filter(
    (f): f is File => f instanceof File,
  );
  if (files.length === 0) {
    return fail(400, 'BAD_REQUEST', 'Nincs fájl a kérésben ("files" mező).');
  }
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return fail(400, 'BAD_REQUEST', `Egyszerre legfeljebb ${MAX_FILES_PER_UPLOAD} fájl tölthető fel.`);
  }

  try {
    const inputs = await Promise.all(
      files.map(async (f) => ({
        filename: f.name,
        type: f.type,
        bytes: new Uint8Array(await f.arrayBuffer()),
      })),
    );
    const results = await uploadDocuments(inputs);
    const accepted = results.filter((r) => r.status !== 'rejected').length;
    console.info(`[upload] ${accepted}/${results.length} accepted`);

    if (accepted === 0) {
      return fail(422, 'VALIDATION_FAILED', 'Egyik fájl sem felelt meg a feltételeknek.', results);
    }
    return ok({ results, accepted, rejected: results.length - accepted }, 201);
  } catch (error) {
    return internalError('upload', error);
  }
}
