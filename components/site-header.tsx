'use client';

import { ChefHat } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Chat' },
  { href: '/documents', label: 'Dokumentumok' },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold">
          <ChefHat className="h-6 w-6 text-primary" aria-hidden />
          <span>Séf asszisztens</span>
        </Link>
        <nav className="flex shrink-0 gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors hover:bg-accent sm:px-3',
                pathname === link.href && 'bg-secondary font-medium',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
