import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface NumberInputProps {
  value: number;
  /** Called on every keystroke that parses to a real number — NOT on every keystroke. */
  onCommit: (n: number) => void;
  min?: number;
  step?: number;
  className?: string;
}

/**
 * A numeric input that doesn't fight the person typing into it.
 *
 * A plain `<Input type="number" value={n} onChange={e => onCommit(parseFloat(e.target.value) || 0)}>`
 * looks fine until someone clears the field to type a new value: the empty
 * string parses to NaN, `|| 0` turns that into 0, which round-trips back into
 * `value` — so the box shows "0" again before they can type anything, and
 * every further keystroke re-triggers the same snap-back. This keeps its own
 * draft string instead: it shows exactly what was typed (including empty,
 * mid-number), only commits upstream when that draft is a real number, and
 * only snaps back to the last valid value on blur if it was left invalid.
 */
export function NumberInput({ value, onCommit, min, step, className }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));

  // Follow external changes (e.g. quantity recomputing price) — but not our
  // own typing, so this must not fire on every render.
  useEffect(() => { setDraft(String(value)); }, [value]);

  return (
    <Input
      type="number"
      min={min}
      step={step}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseFloat(e.target.value);
        if (!Number.isNaN(n)) onCommit(n);
      }}
      onBlur={() => {
        if (draft === '' || Number.isNaN(parseFloat(draft))) setDraft(String(value));
      }}
      className={className}
    />
  );
}
