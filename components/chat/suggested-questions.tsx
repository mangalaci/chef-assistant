'use client';

// The five required test questions from the assignment, one click each.
export const SUGGESTED_QUESTIONS = [
  'Milyen édességet tudok csinálni csokival?',
  'Mit főzhetek, ha van otthon csirkemellfilém?',
  'Van valami gyors vacsora ötleted?',
  'Hogyan készítsek carbonarát?',
  'Milyen vegetáriánus főételeket ajánlasz?',
];

export function SuggestedQuestions({
  onPick,
  disabled,
}: {
  onPick: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="rounded-full border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-primary hover:bg-accent disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
