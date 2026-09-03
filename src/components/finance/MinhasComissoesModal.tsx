import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MinhasComissoesContent } from './MinhasComissoesContent';

interface MinhasComissoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MinhasComissoesModal({ open, onOpenChange }: MinhasComissoesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>As Minhas Comissões</DialogTitle>
        </DialogHeader>
        <MinhasComissoesContent />
      </DialogContent>
    </Dialog>
  );
}
