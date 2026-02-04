import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckSquare, UserPlus, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onAssignTeamMember: () => void;
  onClearSelection: () => void;
  entityLabel?: string;
}

export function BulkActionsBar({
  selectedCount,
  onAssignTeamMember,
  onClearSelection,
  entityLabel = "selecionados",
}: BulkActionsBarProps) {
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
              Atribuir Colaborador
            </Button>
            
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
    </AnimatePresence>
  );
}
