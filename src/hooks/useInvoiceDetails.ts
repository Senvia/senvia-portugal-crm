import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceDetailsParams {
  documentId: number;
  documentType: "invoice" | "invoice_receipt" | "receipt";
  organizationId: string;
}

interface SyncInvoiceParams extends InvoiceDetailsParams {
  saleId: string;
  paymentId?: string;
}

export interface InvoiceDetailsData {
  id: number;
  status: string;
  sequence_number: string;
  atcud: string;
  date: string;
  due_date: string;
  permalink: string;
  sum: number;
  discount: number;
  before_taxes: number;
  taxes: number;
  total: number;
  currency: string;
  tax_exemption: string | null;
  client: {
    id: number;
    name: string;
    fiscal_id: string;
    country: string;
  } | null;
  items: Array<{
    name: string;
    description: string;
    unit_price: string;
    quantity: string;
    tax: { id: number; name: string; value: number };
    discount: number;
    subtotal: number;
    tax_amount: number;
    total: number;
  }>;
  pdf_url?: string | null;
  qr_code_url?: string | null;
}

export function useInvoiceDetails({ documentId, documentType, organizationId }: InvoiceDetailsParams, enabled = true) {
  return useQuery({
    queryKey: ["invoice-details", documentId, documentType],
    queryFn: async () => {
      const res = await supabase.functions.invoke("get-invoice-details", {
        body: {
          document_id: documentId,
          document_type: documentType,
          organization_id: organizationId,
        },
      });

      if (res.error) throw new Error(res.error.message || "Erro ao obter detalhes");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as InvoiceDetailsData;
    },
    enabled: enabled && !!documentId && !!organizationId,
  });
}

export function useSyncInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, documentType, organizationId, saleId, paymentId }: SyncInvoiceParams) => {
      const res = await supabase.functions.invoke("get-invoice-details", {
        body: {
          document_id: documentId,
          document_type: documentType,
          organization_id: organizationId,
          sync: true,
          sale_id: saleId,
          payment_id: paymentId,
        },
      });

      if (res.error) throw new Error(res.error.message || "Erro ao sincronizar");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as InvoiceDetailsData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-details", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["sale-payments", variables.saleId] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Dados sincronizados com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao sincronizar documento");
    },
  });
}
