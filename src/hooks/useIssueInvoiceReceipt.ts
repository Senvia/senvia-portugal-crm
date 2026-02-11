import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IssueInvoiceReceiptParams {
  saleId: string;
  paymentId: string;
  organizationId: string;
}

export function useIssueInvoiceReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, paymentId, organizationId }: IssueInvoiceReceiptParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("issue-invoice-receipt", {
        body: { 
          sale_id: saleId, 
          payment_id: paymentId,
          organization_id: organizationId,
        },
      });

      if (res.error) {
        throw new Error(res.error.message || "Erro ao emitir fatura-recibo");
      }

      const data = res.data;
      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Fatura-Recibo emitida: ${data.invoice_reference}`);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale-payments"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao emitir fatura-recibo");
    },
  });
}
