import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { SiteHeader } from '@/components/site-header';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Séf asszisztens',
  description: 'Receptes RAG asszisztens Jeff Thompson receptgyűjteményén',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body className={`${inter.className} flex min-h-dvh flex-col`}>
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
