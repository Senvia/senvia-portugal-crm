import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useClientDocumentTypes,
  useUpdateClientDocumentTypes,
  type ClientDocumentType,
} from '@/hooks/useClientDocumentTypes';

/** Stable key from a label, so checked documents survive a label rename. */
function slugify(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * The document checklist every client of this org gets on their record
 * (CTR and whatever else the operator requires). Clients store only the
 * checked keys — see crm_clients.documents_checked.
 */
export function ClientDocumentTypesSettings() {
  const { data: saved = [] } = useClientDocumentTypes();
  const updateTypes = useUpdateClientDocumentTypes();
  const [types, setTypes] = useState<ClientDocumentType[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTypes(saved);
  }, [saved]);

  const persist = (next: ClientDocumentType[]) => {
    setTypes(next);
    updateTypes.mutate(next, {
      onSuccess: () => {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      },
    });
  };

  const addType = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key || types.some(t => t.key === key)) return;
    persist([...types, { key, label }]);
    setNewLabel('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos de Cliente
          </CardTitle>
          <CardDescription>
            A lista de documentos que aparece como checklist na ficha de cada cliente.
          </CardDescription>
        </div>
        {updateTypes.isPending ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> A guardar...
          </span>
        ) : justSaved ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" /> Guardado
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 max-w-md">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addType(); } }}
            placeholder="Ex: CTR"
            className="h-9"
          />
          <Button type="button" onClick={addType} disabled={!newLabel.trim()} className="h-9 shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {types.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem documentos configurados. Adicione um acima para aparecer na ficha dos clientes.
          </p>
        ) : (
          <div className="border rounded-lg divide-y">
            {types.map((type) => (
              <div key={type.key} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{type.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{type.key}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Eliminar"
                  onClick={() => persist(types.filter(t => t.key !== type.key))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
