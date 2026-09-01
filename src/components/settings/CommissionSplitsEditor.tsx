import { Plus, Trash2, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface CommissionSplitsEditorProps {
  splits: CommissionSplit[];
  members: Member[];
  profiles: Profile[];
  onChange: (splits: CommissionSplit[]) => void;
  /** Called when an edit is finished and should be persisted. */
  onCommit: (splits: CommissionSplit[]) => void;
}

/**
 * Who gets paid for one catalog product. Each line is either a named person or
 * a profile, and a profile line pays the seller of the sale when they hold it.
 */
export function CommissionSplitsEditor({
  splits,
  members,
  profiles,
  onChange,
  onCommit,
}: CommissionSplitsEditorProps) {
  const addLine = () => {
    onCommit([...splits, { kind: 'user', type: 'fixed', value: 0 }]);
  };

  const updateLine = (index: number, updates: Partial<CommissionSplit>, commit = false) => {
    const next = splits.map((s, i) => (i === index ? { ...s, ...updates } : s));
    if (commit) onCommit(next);
    else onChange(next);
  };

  const removeLine = (index: number) => {
    onCommit(splits.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Comissões</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar comissão
        </Button>
      </div>

      {splits.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sem comissão configurada para este produto.
        </p>
      ) : (
        <div className="space-y-2">
          {splits.map((split, index) => (
            <div
              key={index}
              className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Tipo</Label>
                <Select
                  value={split.kind}
                  onValueChange={(v) =>
                    updateLine(
                      index,
                      // Switching kind clears the other side's reference.
                      v === 'user'
                        ? { kind: 'user', profile_id: undefined }
                        : { kind: 'profile', user_id: undefined },
                      true,
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
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
                <Label className="text-[10px] text-muted-foreground">
                  {split.kind === 'user' ? 'Quem recebe' : 'Perfil do vendedor'}
                </Label>
                {split.kind === 'user' ? (
                  <Select
                    value={split.user_id || ''}
                    onValueChange={(v) => updateLine(index, { user_id: v }, true)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escolher pessoa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={split.profile_id || ''}
                    onValueChange={(v) => updateLine(index, { profile_id: v }, true)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escolher perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {split.type === 'fixed' ? 'Valor (€)' : '% da venda'}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step={split.type === 'fixed' ? '0.01' : '0.1'}
                    min="0"
                    max={split.type === 'fixed' ? undefined : '100'}
                    value={split.value || ''}
                    onChange={(e) => updateLine(index, { value: parseFloat(e.target.value) || 0 })}
                    onBlur={() => onCommit(splits)}
                    placeholder="0"
                    className="h-8 w-[90px] text-xs"
                  />
                  <div className="flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => updateLine(index, { type: 'fixed' }, true)}
                      className={cn(
                        'px-2 py-1 text-[11px] leading-4 transition-colors',
                        split.type === 'fixed'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      €
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLine(index, { type: 'pct' }, true)}
                      className={cn(
                        'px-2 py-1 text-[11px] leading-4 transition-colors',
                        split.type === 'pct'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeLine(index)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground">
            Uma linha de perfil paga a uma pessoa só, o comercial que fez a venda, e apenas se ele
            tiver esse perfil.
          </p>
        </div>
      )}
    </div>
  );
}
