import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MoreHorizontal, Trash2, Zap } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmailAutomation, TRIGGER_TYPES, DELAY_OPTIONS, useAutomations } from '@/hooks/useAutomations';

interface Props {
  automations: EmailAutomation[];
}

export function AutomationsTable({ automations }: Props) {
  const { toggleAutomation, deleteAutomation } = useAutomations();

  const getTriggerLabel = (type: string) =>
    TRIGGER_TYPES.find(t => t.value === type)?.label || type;

  const getDelayLabel = (minutes: number) =>
    DELAY_OPTIONS.find(d => d.value === minutes)?.label || `${minutes} min`;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Gatilho</TableHead>
            <TableHead className="hidden md:table-cell">Template</TableHead>
            <TableHead className="hidden lg:table-cell">Atraso</TableHead>
            <TableHead className="hidden lg:table-cell">Disparos</TableHead>
            <TableHead>Ativa</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhuma automação configurada
              </TableCell>
            </TableRow>
          ) : (
            automations.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{a.name}</span>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {getTriggerLabel(a.trigger_type)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline">{getTriggerLabel(a.trigger_type)}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {a.template?.name || '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {getDelayLabel(a.delay_minutes)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {a.total_triggered}
                  {a.last_triggered_at && (
                    <span className="text-xs text-muted-foreground block">
                      {format(new Date(a.last_triggered_at), "dd/MM HH:mm", { locale: pt })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={a.is_active}
                    onCheckedChange={(checked) => toggleAutomation.mutate({ id: a.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteAutomation.mutate(a.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
