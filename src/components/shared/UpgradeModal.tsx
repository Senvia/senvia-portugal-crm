import { Lock, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPlan: string;
}

export function UpgradeModal({ open, onOpenChange, featureName, requiredPlan }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Funcionalidade Premium</DialogTitle>
          <DialogDescription className="text-center text-sm">
            <strong>{featureName}</strong> está disponível a partir do plano{' '}
            <span className="font-semibold text-primary">{requiredPlan}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2 mt-2">
          <p>Faça upgrade para desbloquear:</p>
          <ul className="space-y-1.5 ml-1">
            <li className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Acesso ao módulo <strong>{featureName}</strong>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Mais utilizadores e formulários
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Integrações avançadas
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button className="w-full gap-2" onClick={() => onOpenChange(false)}>
            Falar com Vendas
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
