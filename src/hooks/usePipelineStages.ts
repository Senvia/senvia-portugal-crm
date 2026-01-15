import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NicheType, getNicheTemplate } from "@/lib/pipeline-templates";

export interface PipelineStage {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  color: string;
  position: number;
  is_final_positive: boolean;
  is_final_negative: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelineStages() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!session,
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage: Omit<PipelineStage, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert(stage)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar etapa: ${error.message}`);
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineStage> & { id: string }) => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar etapa: ${error.message}`);
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa eliminada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao eliminar etapa: ${error.message}`);
    },
  });
}

export function useReorderPipelineStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stages: { id: string; position: number }[]) => {
      // Update each stage's position
      const updates = stages.map(({ id, position }) =>
        supabase
          .from("pipeline_stages")
          .update({ position })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error("Erro ao reordenar etapas");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar: ${error.message}`);
    },
  });
}

export function useApplyNicheTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, niche }: { organizationId: string; niche: NicheType }) => {
      const template = getNicheTemplate(niche);

      // Delete existing stages
      const { error: deleteError } = await supabase
        .from("pipeline_stages")
        .delete()
        .eq("organization_id", organizationId);

      if (deleteError) throw deleteError;

      // Insert new stages from template
      const stages = template.stages.map(stage => ({
        ...stage,
        organization_id: organizationId,
      }));

      const { error: insertError } = await supabase
        .from("pipeline_stages")
        .insert(stages);

      if (insertError) throw insertError;

      // Update organization niche
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ niche })
        .eq("id", organizationId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Template aplicado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aplicar template: ${error.message}`);
    },
  });
}
