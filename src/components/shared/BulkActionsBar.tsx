import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckSquare, UserPlus, X, Download, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BulkActionsBarProps {
  selectedCount: number;
  onAssignTeamMember: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
  entityLabel?: string;
}

export function BulkActionsBar({
  selectedCount,
  onAssignTeamMember,
  onExportCsv,
  onExportExcel,
  onDelete,
  onClearSelection,
  entityLabel = "selecionados",
}: BulkActionsBarProps) {
  const hasExportOptions = onExportCsv || onExportExcel;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-primary/10 border border-primary/20"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedCount} {entityLabel}</span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={onAssignTeamMember}
              className="flex-1 sm:flex-none"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Atribuir Comercial Responsável</span>
              <span className="sm:hidden">Atribuir</span>
            </Button>
            
            {hasExportOptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="flex-1 sm:flex-none">
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExportCsv && (
                    <DropdownMenuItem onClick={onExportCsv}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                  )}
                  {onExportExcel && (
                    <DropdownMenuItem onClick={onExportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Apagar</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1">Limpar</span>
            </Button>
          </div>
        </motion.div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {selectedCount} {entityLabel}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); onDelete?.(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
}
