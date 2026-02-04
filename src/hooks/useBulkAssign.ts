import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BulkAssignLeadsParams {
  leadIds: string[];
  assignedTo: string | null;
}

interface BulkAssignClientsParams {
  clientIds: string[];
  assignedTo: string | null;
}

export function useBulkAssignLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadIds, assignedTo }: BulkAssignLeadsParams) => {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assignedTo })
        .in("id", leadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useBulkAssignClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientIds, assignedTo }: BulkAssignClientsParams) => {
      const { error } = await supabase
        .from("crm_clients")
        .update({ assigned_to: assignedTo })
        .in("id", clientIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
