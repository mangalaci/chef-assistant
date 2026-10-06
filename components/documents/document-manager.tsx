'use client';

import { Loader2, PlayCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DocumentList, type DocumentRow } from './document-list';
import { UploadDropzone, type Rejected } from './upload-dropzone';

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

type UploadResult = { filename: string; status: 'created' | 'replaced' | 'rejected'; id?: string; error?: string };
type ProcessResult = { id: string; filename: string; status: 'processed' | 'failed'; chunkCount?: number; error?: string };

// Calls our API; on { ok: false } throws with the server's Hungarian message.
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) {
    const err = new Error(body.error.message) as Error & { details?: unknown };
    err.details = body.error.details;
    throw err;
  }
  return body.data;
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ documents: DocumentRow[] }>('/api/documents');
      setDocuments(data.documents);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markBusy = (ids: string[], busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });

  const process = async (ids?: string[]) => {
    const targets = ids ?? (documents ?? []).filter((d) => d.status === 'uploaded' || d.status === 'failed').map((d) => d.id);
    if (targets.length === 0) return;
    markBusy(targets, true);
    try {
      const data = await api<{ results: ProcessResult[]; processed: number; failed: number; chunks: number }>(
        '/api/process',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(ids ? { documentIds: ids } : {}),
        },
      );
      if (data.failed > 0) {
        const failed = data.results.filter((r) => r.status === 'failed');
        toast.error(`${data.failed} dokumentum feldolgozása nem sikerült`, {
          description: failed.map((r) => `${r.filename}: ${r.error}`).join('\n'),
        });
      }
      if (data.processed > 0) {
        toast.success(`${data.processed} dokumentum feldolgozva`, { description: `${data.chunks} chunk került a keresőbe.` });
      }
    } catch (e) {
      toast.error('A feldolgozás nem sikerült', { description: (e as Error).message });
    } finally {
      markBusy(targets, false);
      refresh();
    }
  };

  // Upload, then process right away: two API calls, one user action.
  const upload = async (files: File[], rejected: Rejected[]) => {
    if (rejected.length) {
      toast.warning(`${rejected.length} fájl kihagyva`, {
        description: rejected.map((r) => `${r.name}: ${r.reason}`).join('\n'),
      });
    }
    if (files.length === 0) return;

    setUploading(true);
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    try {
      const data = await api<{ results: UploadResult[] }>('/api/upload', { method: 'POST', body: form });
      const ok = data.results.filter((r) => r.status !== 'rejected');
      const replaced = ok.filter((r) => r.status === 'replaced').length;
      const bad = data.results.filter((r) => r.status === 'rejected');
      toast.success(`${ok.length} fájl feltöltve`, {
        description: replaced ? `${replaced} meglévő fájl felülírva.` : undefined,
      });
      if (bad.length) {
        toast.error(`${bad.length} fájlt a szerver elutasított`, {
          description: bad.map((r) => `${r.filename}: ${r.error}`).join('\n'),
        });
      }
      await refresh();
      setUploading(false);
      await process(ok.flatMap((r) => (r.id ? [r.id] : [])));
    } catch (e) {
      const details = (e as Error & { details?: UploadResult[] }).details;
      toast.error((e as Error).message, {
        description: Array.isArray(details) ? details.map((r) => `${r.filename}: ${r.error}`).join('\n') : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (doc: DocumentRow) => {
    markBusy([doc.id], true);
    try {
      await api(`/api/documents/${doc.id}`, { method: 'DELETE' });
      toast.success(`${doc.filename} törölve`);
      setDocuments((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
    } catch (e) {
      toast.error('A törlés nem sikerült', { description: (e as Error).message });
    } finally {
      markBusy([doc.id], false);
    }
  };

  const pending = (documents ?? []).filter((d) => d.status === 'uploaded' || d.status === 'failed').length;
  const totalChunks = (documents ?? []).reduce((n, d) => n + d.chunkCount, 0);

  return (
    <div className="space-y-6">
      <UploadDropzone onFiles={upload} disabled={uploading} />
      {uploading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Feltöltés…
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Dokumentumok
            {documents && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {documents.length} db · {totalChunks} chunk
              </span>
            )}
          </h2>
          {pending > 0 && (
            <Button size="sm" onClick={() => process()} disabled={busyIds.size > 0}>
              <PlayCircle className="mr-1.5 h-4 w-4" /> {pending} feldolgozatlan feldolgozása
            </Button>
          )}
        </div>

        {loadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">
            A lista nem tölthető be: {loadError}{' '}
            <button className="underline" onClick={refresh}>Újra</button>
          </div>
        )}
        {documents === null && !loadError ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          documents && (
            <DocumentList documents={documents} busyIds={busyIds} onProcess={(id) => process([id])} onDelete={remove} />
          )
        )}
      </section>
    </div>
  );
}
