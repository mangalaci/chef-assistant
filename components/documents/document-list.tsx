'use client';

import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type DocumentRow = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
};

const STATUS: Record<DocumentRow['status'], { label: string; variant: BadgeProps['variant'] }> = {
  uploaded: { label: 'Feltöltve', variant: 'warning' },
  processing: { label: 'Feldolgozás…', variant: 'secondary' },
  processed: { label: 'Kész', variant: 'success' },
  failed: { label: 'Hiba', variant: 'destructive' },
};

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1).replace('.', ',')} kB`;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

export function DocumentList({
  documents,
  busyIds,
  onProcess,
  onDelete,
}: {
  documents: DocumentRow[];
  busyIds: Set<string>;
  onProcess: (id: string) => void;
  onDelete: (doc: DocumentRow) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => documents.filter((d) => d.filename.toLowerCase().includes(query.trim().toLowerCase())),
    [documents, query],
  );

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Még nincs feltöltött dokumentum. Húzz be egy receptet fent, vagy futtasd a <code>pnpm seed</code> parancsot.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Keresés fájlnévre…"
        aria-label="Keresés fájlnévre"
        className="bg-card"
      />

      {/* Desktop: table-like grid. Mobile: one card per document. */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[1fr_6rem_6rem_5rem_9rem_5.5rem] gap-3 border-b bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>Fájl</span>
          <span>Állapot</span>
          <span className="text-right">Méret</span>
          <span className="text-right">Chunk</span>
          <span>Feltöltve</span>
          <span className="sr-only">Műveletek</span>
        </div>
        <ul className="divide-y">
          {filtered.map((doc) => {
            const busy = busyIds.has(doc.id) || doc.status === 'processing';
            const status = busy ? STATUS.processing : STATUS[doc.status];
            return (
              <li
                key={doc.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm md:grid-cols-[1fr_6rem_6rem_5rem_9rem_5.5rem]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium" title={doc.filename}>{doc.filename}</p>
                  {doc.status === 'failed' && doc.errorMessage && (
                    <p className="truncate text-xs text-destructive" title={doc.errorMessage}>{doc.errorMessage}</p>
                  )}
                  <p className="text-xs text-muted-foreground md:hidden">
                    {formatSize(doc.sizeBytes)} · {doc.chunkCount} chunk · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="order-first col-span-2 md:order-none md:col-span-1">
                  <Badge variant={status.variant}>
                    {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />}
                    {status.label}
                  </Badge>
                </div>
                <span className="hidden text-right tabular-nums md:block">{formatSize(doc.sizeBytes)}</span>
                <span className="hidden text-right tabular-nums md:block">{doc.chunkCount}</span>
                <span className="hidden text-xs text-muted-foreground md:block">{formatDate(doc.createdAt)}</span>
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={busy}
                    onClick={() => onProcess(doc.id)}
                    aria-label={doc.status === 'processed' ? `${doc.filename} újrafeldolgozása` : `${doc.filename} feldolgozása`}
                    title={doc.status === 'processed' ? 'Újrafeldolgozás' : 'Feldolgozás'}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={busy}
                        aria-label={`${doc.filename} törlése`}
                        title="Törlés"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Törlöd a dokumentumot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A(z) <strong>{doc.filename}</strong> és a hozzá tartozó {doc.chunkCount} chunk
                        végleg törlődik, a chat többé nem találja meg.
                      </AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Mégse</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(doc)}>Törlés</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">Nincs ilyen nevű dokumentum.</p>
        )}
      </div>
    </div>
  );
}
