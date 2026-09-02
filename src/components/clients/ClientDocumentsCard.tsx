import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useUpdateClient } from '@/hooks/useClients';
import { useClientDocumentTypes } from '@/hooks/useClientDocumentTypes';

interface ClientDocumentsCardProps {
  clientId: string;
  checked?: string[] | null;
}

/**
 * Which of the org's document types this client has handed in. The list of
 * types is org-level config (Definições → Documentos de Cliente); the client
 * stores only the checked keys.
 */
export function ClientDocumentsCard({ clientId, checked }: ClientDocumentsCardProps) {
  const { data: types = [] } = useClientDocumentTypes();
  const updateClient = useUpdateClient();

  const checkedKeys = checked ?? [];

  if (types.length === 0) return null;

  const toggle = (key: string, next: boolean) => {
    const documents_checked = next
      ? [...new Set([...checkedKeys, key])]
      : checkedKeys.filter(k => k !== key);
    updateClient.mutate({ id: clientId, documents_checked } as any);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {types.map((type) => (
          <div key={type.key} className="flex items-center gap-2">
            <Checkbox
              id={`doc-${clientId}-${type.key}`}
              checked={checkedKeys.includes(type.key)}
              onCheckedChange={(v) => toggle(type.key, v === true)}
            />
            <Label htmlFor={`doc-${clientId}-${type.key}`} className="text-sm cursor-pointer font-normal">
              {type.label}
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
