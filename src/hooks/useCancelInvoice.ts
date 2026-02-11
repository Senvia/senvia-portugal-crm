import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CancelInvoiceParams {
  paymentId: string;
  organizationId: string;
  reason: string;
  invoicexpressId: number;
  documentType: "invoice" | "invoice_receipt";
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, organizationId, reason, invoicexpressId, documentType }: CancelInvoiceParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("cancel-invoice", {
        body: {
          payment_id: paymentId,
          organization_id: organizationId,
          reason,
          invoicexpress_id: invoicexpressId,
          document_type: documentType,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Fatura anulada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["sale-payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao anular fatura: ${error.message}`);
    },
  });
}
