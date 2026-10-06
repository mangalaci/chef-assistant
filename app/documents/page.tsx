import type { Metadata } from 'next';

import { DocumentManager } from '@/components/documents/document-manager';

export const metadata: Metadata = { title: 'Dokumentumok – Séf asszisztens' };

export default function DocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Receptek és dokumentumok</h1>
        <p className="text-sm text-muted-foreground">
          Tölts fel saját receptet (.md vagy .txt): a rendszer szekciókra bontja, embeddinget készít
          belőle, és a chat azonnal használja.
        </p>
      </div>
      <DocumentManager />
    </div>
  );
}
