'use client';

import { UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// Same limits as the server (lib/services/documents.ts). The server checks
// again; this only saves a round trip for obviously wrong files.
const MAX_FILE_BYTES = 1024 * 1024;
const ALLOWED = ['.md', '.txt'];

export type Rejected = { name: string; reason: string };

const precheck = (files: File[]) => {
  const accepted: File[] = [];
  const rejected: Rejected[] = [];
  for (const file of files) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED.includes(ext)) rejected.push({ name: file.name, reason: 'csak .md és .txt' });
    else if (file.size === 0) rejected.push({ name: file.name, reason: 'üres fájl' });
    else if (file.size > MAX_FILE_BYTES) rejected.push({ name: file.name, reason: 'nagyobb 1 MB-nál' });
    else accepted.push(file);
  }
  return { accepted, rejected };
};

export function UploadDropzone({
  onFiles,
  disabled,
}: {
  onFiles: (accepted: File[], rejected: Rejected[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const { accepted, rejected } = precheck([...list]);
    onFiles(accepted, rejected);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card px-6 py-10 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging ? 'border-primary bg-accent' : 'border-input hover:border-primary/60',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <UploadCloud className="h-8 w-8 text-primary" aria-hidden />
      <p className="font-medium">Húzd ide a recepteket, vagy kattints a tallózáshoz</p>
      <p className="text-xs text-muted-foreground">.md vagy .txt, fájlonként legfeljebb 1 MB, egyszerre több fájl is</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
