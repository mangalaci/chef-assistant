'use client';

import type { UIMessage } from 'ai';
import { BookOpen, Filter, ListChecks, Search } from 'lucide-react';

// A tool call as it arrives in a UI message part ("tool-searchRecipes" etc.).
export type ToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

// The SDK types tool parts generically; this picks them out with the fields
// the UI reads.
export const toolPartsOf = (message: UIMessage): ToolPart[] =>
  message.parts.filter((p) => p.type.startsWith('tool-')) as unknown as ToolPart[];

type Named = { recipeName?: string | null };

const unique = (names: Array<string | null | undefined>) =>
  [...new Set(names.filter((n): n is string => Boolean(n)))];

// Recipe names a tool call actually returned.
export const recipesFrom = (part: ToolPart): string[] => {
  if (part.state !== 'output-available' || !part.output) return [];
  const out = part.output as {
    results?: Named[];
    recipes?: Named[];
    recipe?: Named | null;
  };
  return unique([
    ...(out.results ?? []).map((r) => r.recipeName),
    ...(out.recipes ?? []).map((r) => r.recipeName),
    out.recipe?.recipeName,
  ]);
};

const FILTER_LABELS: Record<string, (v: unknown) => string | null> = {
  vegetarian: (v) => (v ? 'vegetáriánus' : 'húsos is'),
  maxPrepMinutes: (v) => `≤ ${v} perc`,
  difficulty: (v) => ({ easy: 'könnyű', medium: 'közepes', hard: 'nehéz' })[String(v)] ?? String(v),
  category: (v) => String(v),
  sectionTypes: (v) => (Array.isArray(v) ? v.join(', ') : null),
};

const describe = (part: ToolPart) => {
  const input = part.input ?? {};
  const filters = Object.entries(input)
    .filter(([key]) => key in FILTER_LABELS)
    .map(([key, value]) => FILTER_LABELS[key](value))
    .filter(Boolean)
    .join(', ');
  switch (part.type) {
    case 'tool-searchRecipes':
      return { icon: Search, text: `Keresés: „${input.query ?? ''}”${filters ? ` (${filters})` : ''}` };
    case 'tool-filterRecipes':
      return { icon: Filter, text: `Szűrés: ${filters || 'minden recept'}` };
    case 'tool-getRecipe':
      return { icon: BookOpen, text: `Teljes recept: ${input.name ?? ''}` };
    case 'tool-listRecipeCatalog':
      return { icon: ListChecks, text: 'A teljes receptlista' };
    default:
      return { icon: Search, text: part.type.replace('tool-', '') };
  }
};

// The label shown while a tool is still running.
export const runningLabel = (part: ToolPart) => describe(part).text;

// Makes the RAG step visible: which recipes the answer names that really came
// from a tool (the answer quotes the original English name in parentheses),
// and how many recipes the tools returned in total.
export function ToolTrace({ parts, answer }: { parts: ToolPart[]; answer: string }) {
  if (parts.length === 0) return null;
  const recipes = unique(parts.flatMap(recipesFrom));
  const cited = recipes.filter((name) => answer.includes(name));

  return (
    <details className="group mt-3 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none list-none">
        <span className="font-medium text-foreground">Forrás a gyűjteményből:</span>{' '}
        {cited.length > 0 ? cited.join(', ') : 'egyik ajánlott recept sem a találatokból'}
        <span className="ml-1">· {recipes.length} recept átnézve</span>
        <span className="ml-1 underline-offset-2 group-open:hidden hover:underline">(részletek)</span>
      </summary>
      <ul className="mt-2 space-y-1.5">
        {parts.map((part) => {
          const { icon: Icon, text } = describe(part);
          const found = recipesFrom(part).length;
          return (
            <li key={part.toolCallId} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {text}
                {part.state === 'output-available' && ` → ${found} recept`}
                {part.state === 'output-error' && ` → hiba: ${part.errorText}`}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
