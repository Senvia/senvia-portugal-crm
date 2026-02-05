import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InvoicesContent } from "@/components/finance/InvoicesContent";

export default function FinanceInvoices() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/financeiro')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Faturas</h1>
            <p className="text-sm text-muted-foreground">
              Referências de faturas emitidas
            </p>
          </div>
        </div>

        <InvoicesContent />
      </div>
    </AppLayout>
  );
}
