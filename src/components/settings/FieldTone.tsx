import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Colour coding for the money fields of a product's commission setup.
 *
 * A band row carries four different kinds of euro — what the operator pays,
 * what the client pays, what the seller earns, what the band rewards — and as
 * four identical grey boxes they were read as one. Each kind gets a colour and
 * keeps it everywhere it appears, so the same money is always the same colour.
 *
 * Written out in full because Tailwind only keeps class names it can see; a
 * template string like `bg-${tone}-500/10` is purged from the build.
 */
export type FieldToneName = 'operator' | 'price' | 'commission' | 'bonus' | 'cards' | 'neutral';

const TONES: Record<FieldToneName, { box: string; label: string }> = {
  /** Money coming IN from the operator. */
  operator: {
    box: 'border-amber-500/40 bg-amber-500/10',
    label: 'text-amber-700 dark:text-amber-400',
  },
  /** What the client pays — the monthly fee. */
  price: {
    box: 'border-sky-500/40 bg-sky-500/10',
    label: 'text-sky-700 dark:text-sky-400',
  },
  /** Money going OUT to a salesperson. */
  commission: {
    box: 'border-emerald-500/40 bg-emerald-500/10',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  /** The one-off reward for reaching a band. */
  bonus: {
    box: 'border-violet-500/40 bg-violet-500/10',
    label: 'text-violet-700 dark:text-violet-400',
  },
  /** Card counts — not euros, but part of what a line is worth. */
  cards: {
    box: 'border-cyan-500/40 bg-cyan-500/10',
    label: 'text-cyan-700 dark:text-cyan-400',
  },
  /** Everything that is not money: who, and how many. Same box, no colour. */
  neutral: {
    box: 'border-border bg-muted/40',
    label: 'text-muted-foreground',
  },
};

/** One coloured, labelled box around whatever input it wraps. */
export function TonedField({
  tone,
  label,
  icon,
  className,
  children,
}: {
  tone: FieldToneName;
  label: ReactNode;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className={cn('space-y-1 shrink-0 rounded-md border px-2 py-1.5', t.box, className)}>
      <Label className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', t.label)}>
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

/** The input styling that goes inside a TonedField, so they match everywhere. */
export const tonedInputClass = 'h-8 bg-background text-xs font-semibold';
