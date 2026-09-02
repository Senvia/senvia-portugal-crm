import { Trash2, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CommissionSplit } from '@/types/proposals';

interface Member {
  user_id: string;
  full_name: string;
}

interface Profile {
  id: string;
  name: string;
}

interface CommissionSplitRowProps {
  split: CommissionSplit;
  members: Member[];
  profiles: Profile[];
  showLabels?: boolean;
  onChange: (updates: Partial<CommissionSplit>, commit?: boolean) => void;
  onCommit: () => void;
  onRemove: () => void;
  /** Extra field rendered on the same line, before the remove button (e.g. a tier's Bónus Geral). */
  trailing?: React.ReactNode;
}

/** One "who gets paid, how much" line — Tipo / Quem recebe / Valor / remove. Shared
 * between the flat commission editor and each quantity-tier's recipient list. */
export function CommissionSplitRow({
  split,
  members,
  profiles,
  showLabels = true,
  onChange,
  onCommit,
  onRemove,
  trailing,
}: CommissionSplitRowProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1 w-[110px] shrink-0">
        {showLabels && <Label className="text-[10px] text-muted-foreground">Tipo</Label>}
        <Select
          value={split.kind}
          onValueChange={(v) =>
            onChange(
              // Switching kind clears the other side's reference.
              v === 'user'
                ? { kind: 'user', profile_id: undefined }
                : { kind: 'profile', user_id: undefined },
              true,
            )
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Pessoa
              </span>
            </SelectItem>
            <SelectItem value="profile">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Perfil
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 flex-1 min-w-[160px]">
        {showLabels && (
          <Label className="text-[10px] text-muted-foreground">
            {split.kind === 'user' ? 'Quem recebe' : 'Perfil do vendedor'}
          </Label>
        )}
        {split.kind === 'user' ? (
          <Select value={split.user_id || ''} onValueChange={(v) => onChange({ user_id: v }, true)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Escolher pessoa..." />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={split.profile_id || ''} onValueChange={(v) => onChange({ profile_id: v }, true)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Escolher perfil..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1">
        {showLabels && (
          <Label className="text-[10px] text-muted-foreground">
            {split.type === 'fixed' ? 'Valor (€)' : '% da venda'}
          </Label>
        )}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step={split.type === 'fixed' ? '0.01' : '0.1'}
            min="0"
            max={split.type === 'fixed' ? undefined : '100'}
            value={split.value || ''}
            onChange={(e) => onChange({ value: parseFloat(e.target.value) || 0 })}
            onBlur={onCommit}
            placeholder="0"
            className="h-8 w-[90px] text-xs"
          />
          <div className="flex overflow-hidden rounded-md border shrink-0">
            <button
              type="button"
              onClick={() => onChange({ type: 'fixed' }, true)}
              className={cn(
                'px-2 py-1 text-[11px] leading-4 transition-colors',
                split.type === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              €
            </button>
            <button
              type="button"
              onClick={() => onChange({ type: 'pct' }, true)}
              className={cn(
                'px-2 py-1 text-[11px] leading-4 transition-colors',
                split.type === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              %
            </button>
          </div>
        </div>
      </div>

      {trailing}

      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
