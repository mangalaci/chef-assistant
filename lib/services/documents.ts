import { asc, desc, eq, inArray } from 'drizzle-orm';

import { chunkDocument } from '@/lib/ai/chunking';
import { embedChunks } from '@/lib/ai/embedding';
import { db } from '@/lib/db';
import { documents, documentStatus, type Document } from '@/lib/db/schema/documents';
import { embeddings } from '@/lib/db/schema/embeddings';

// Business logic for documents. API routes and scripts call these functions;
// the routes only validate input and translate results to HTTP.

export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 50;

const ALLOWED_EXTENSIONS = ['.md', '.txt'];
const ALLOWED_MIME_TYPES = [
  'text/markdown',
  'text/x-markdown',
  'text/plain',
  // Browsers often send an empty or generic type for .md files; for these the
  // extension decides.
  '',
  'application/octet-stream',
];

export type UploadInput = { filename: string; type: string; bytes: Uint8Array };

export type UploadResult =
  | { filename: string; status: 'created' | 'replaced'; id: string; sizeBytes: number }
  | { filename: string; status: 'rejected'; error: string };

export type ProcessResult =
  | { id: string; filename: string; status: 'processed'; chunkCount: number; tokens: number; ms: number }
  | { id: string; filename: string; status: 'failed'; error: string; ms: number };

const extensionOf = (filename: string) =>
  filename.slice(filename.lastIndexOf('.')).toLowerCase();

// Keeps only the base name, so "../../x.md" or "C:\\a\\x.md" become "x.md".
export const cleanFilename = (name: string) =>
  name.split(/[\\/]/).pop()!.trim().slice(0, 255);

const mimeTypeFor = (filename: string) =>
  extensionOf(filename) === '.md' ? 'text/markdown' : 'text/plain';

// Returns the decoded text, or an error message in Hungarian for the client.
export const validateUpload = (
  input: UploadInput,
): { content: string } | { error: string } => {
  const ext = extensionOf(input.filename);
  if (!input.filename || input.filename.startsWith('.')) {
    return { error: 'Hiányzó vagy érvénytelen fájlnév.' };
  }
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: `Nem támogatott fájltípus (${ext || 'nincs kiterjesztés'}). Csak .md és .txt.` };
  }
  if (!ALLOWED_MIME_TYPES.includes(input.type)) {
    return { error: `Nem támogatott tartalomtípus: ${input.type}.` };
  }
  if (input.bytes.byteLength > MAX_FILE_BYTES) {
    return { error: `A fájl túl nagy (${input.bytes.byteLength} bájt, max. ${MAX_FILE_BYTES}).` };
  }

  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(input.bytes);
  } catch {
    return { error: 'A fájl nem érvényes UTF-8 szöveg.' };
  }
  content = content.replace(/^\uFEFF/, '');
  if (!content.trim()) return { error: 'A fájl üres.' };
  return { content };
};

// Stores files with status "uploaded"; does not embed. An existing file with
// the same name is overwritten and its old chunks are deleted.
export const uploadDocuments = async (inputs: UploadInput[]): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];

  for (const input of inputs) {
    const filename = cleanFilename(input.filename);
    const checked = validateUpload({ ...input, filename });
    if ('error' in checked) {
      results.push({ filename, status: 'rejected', error: checked.error });
      continue;
    }

    const values = {
      filename,
      mimeType: mimeTypeFor(filename),
      sizeBytes: input.bytes.byteLength,
      content: checked.content,
    };

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.filename, filename));

      if (!existing) {
        const [row] = await tx.insert(documents).values(values).returning({ id: documents.id });
        return { id: row.id, status: 'created' as const };
      }

      await tx.delete(embeddings).where(eq(embeddings.documentId, existing.id));
      await tx
        .update(documents)
        .set({
          ...values,
          status: 'uploaded',
          chunkCount: 0,
          errorMessage: null,
          createdAt: new Date(),
          processedAt: null,
        })
        .where(eq(documents.id, existing.id));
      return { id: existing.id, status: 'replaced' as const };
    });

    results.push({ filename, ...result, sizeBytes: values.sizeBytes });
  }
  return results;
};

const processOne = async (doc: Document): Promise<ProcessResult> => {
  const started = Date.now();
  await db
    .update(documents)
    .set({ status: 'processing', errorMessage: null })
    .where(eq(documents.id, doc.id));

  try {
    const chunks = chunkDocument(doc.filename, doc.content);
    if (chunks.length === 0) throw new Error('A dokumentumból nem keletkezett chunk.');
    const { vectors, tokens } = await embedChunks(chunks.map((c) => c.content));

    await db.transaction(async (tx) => {
      await tx.delete(embeddings).where(eq(embeddings.documentId, doc.id));
      await tx.insert(embeddings).values(
        chunks.map((c, i) => ({
          documentId: doc.id,
          chunkIndex: c.chunkIndex,
          content: c.content,
          recipeName: c.recipeName,
          sectionType: c.sectionType,
          category: c.category,
          difficulty: c.difficulty,
          metadata: c.metadata,
          embedding: vectors[i],
        })),
      );
      await tx
        .update(documents)
        .set({ status: 'processed', chunkCount: chunks.length, processedAt: new Date() })
        .where(eq(documents.id, doc.id));
    });

    return { id: doc.id, filename: doc.filename, status: 'processed', chunkCount: chunks.length, tokens, ms: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[process] ${doc.filename}:`, error);
    await db
      .update(documents)
      .set({ status: 'failed', errorMessage: message.slice(0, 1000) })
      .where(eq(documents.id, doc.id));
    return { id: doc.id, filename: doc.filename, status: 'failed', error: message, ms: Date.now() - started };
  }
};

// Chunks and embeds the given documents, or every document that is not yet
// processed when no ids are given. One failing document does not stop the rest.
export const processDocuments = async (documentIds?: string[]) => {
  const docs = documentIds
    ? await db.select().from(documents).where(inArray(documents.id, documentIds))
    : await db.select().from(documents).where(inArray(documents.status, ['uploaded', 'failed']));

  const found = new Set(docs.map((d) => d.id));
  const notFound = (documentIds ?? []).filter((id) => !found.has(id));

  const results: ProcessResult[] = [];
  for (const doc of docs) results.push(await processOne(doc));
  return { results, notFound };
};

export type DocumentStatus = (typeof documentStatus.enumValues)[number];
export const DOCUMENT_STATUSES = documentStatus.enumValues;

// The list leaves out `content`: it can be up to 1 MB per document.
export const listDocuments = async (status?: DocumentStatus) =>
  db
    .select({
      id: documents.id,
      filename: documents.filename,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      status: documents.status,
      chunkCount: documents.chunkCount,
      errorMessage: documents.errorMessage,
      createdAt: documents.createdAt,
      processedAt: documents.processedAt,
    })
    .from(documents)
    .where(status ? eq(documents.status, status) : undefined)
    .orderBy(desc(documents.createdAt), asc(documents.filename));

// Deletes the document; its chunks go with it (ON DELETE CASCADE).
// Returns null when there is no such document.
export const deleteDocument = async (id: string) => {
  const [deleted] = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id, filename: documents.filename, chunkCount: documents.chunkCount });
  return deleted ?? null;
};
