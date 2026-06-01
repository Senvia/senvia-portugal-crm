import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, FileX, AlertTriangle } from "lucide-react";
import { useLeadImports, useDeleteLeadImport, type LeadImportRow } from "@/hooks/useLeadImports";
import { usePermissions } from "@/hooks/usePermissions";

interface ImportsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportsHistoryDialog({ open, onOpenChange }: ImportsHistoryDialogProps) {
  const { data: imports = [], isLoading } = useLeadImports();
  const deleteImport = useDeleteLeadImport();
  const { can, isAdmin } = usePermissions();

  const canDelete = isAdmin || can("leads", "imports", "delete");

  const [confirming, setConfirming] = useState<LeadImportRow | null>(null);

  const handleConfirmDelete = async () => {
    if (!confirming) return;
    await deleteImport.mutateAsync(confirming.id);
    setConfirming(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Importações</DialogTitle>
            <DialogDescription>
              Lotes de leads importados nesta organização. Só podes apagar lotes onde nenhum lead já tenha atividade (proposta, cliente, venda, encomenda ou evento).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : imports.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileX className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>Ainda não há importações.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Por</TableHead>
                    <TableHead className="text-right">Importados</TableHead>
                    <TableHead className="text-right">Ainda existem</TableHead>
                    <TableHead className="text-right">Com atividade</TableHead>
                    {canDelete && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => {
                    const locked = imp.leads_with_activity > 0;
                    return (
                      <TableRow key={imp.id}>
                        <TableCell className="font-medium">
                          {imp.name || (
                            <span className="text-muted-foreground italic">(sem nome)</span>
                          )}
                          {imp.file_name && (
                            <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {imp.file_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{imp.import_code}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(imp.created_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}
                        </TableCell>
                        <TableCell className="text-sm">{imp.importer_name || "—"}</TableCell>
                        <TableCell className="text-right">{imp.total_inserted}</TableCell>
                        <TableCell className="text-right">{imp.leads_remaining}</TableCell>
                        <TableCell className="text-right">
                          {imp.leads_with_activity > 0 ? (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                              {imp.leads_with_activity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        {canDelete && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={locked || deleteImport.isPending}
                              onClick={() => setConfirming(imp)}
                              title={
                                locked
                                  ? `${imp.leads_with_activity} lead(s) já têm atividade — não é possível apagar este lote.`
                                  : "Apagar importação"
                              }
                            >
                              {locked ? <AlertTriangle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar importação?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming && (
                <>
                  Vais apagar a importação <strong>"{confirming.name || confirming.import_code}"</strong>:
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                    <li>{confirming.leads_remaining} lead(s) serão eliminados.</li>
                    <li>O registo da importação será removido.</li>
                  </ul>
                  <p className="mt-3 text-sm text-destructive">
                    Esta ação não pode ser revertida.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteImport.isPending}
            >
              {deleteImport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
