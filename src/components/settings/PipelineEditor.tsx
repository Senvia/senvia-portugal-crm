import { useState } from "react";
import { 
  usePipelineStages, 
  useCreatePipelineStage, 
  useUpdatePipelineStage, 
  useDeletePipelineStage,
  useReorderPipelineStages,
  useApplyNicheTemplate,
  PipelineStage 
} from "@/hooks/usePipelineStages";
import { useOrganization } from "@/hooks/useOrganization";
import { NICHE_TEMPLATES, NicheType, NICHE_LABELS } from "@/lib/pipeline-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Building2, 
  Heart, 
  Hammer, 
  Wifi, 
  ShoppingCart, 
  Home,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const NICHE_ICONS: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Hammer: <Hammer className="h-5 w-5" />,
  Wifi: <Wifi className="h-5 w-5" />,
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  Home: <Home className="h-5 w-5" />,
};

interface EditingStage {
  id?: string;
  name: string;
  key: string;
  color: string;
  is_final_positive: boolean;
  is_final_negative: boolean;
}

const DEFAULT_NEW_STAGE: EditingStage = {
  name: "",
  key: "",
  color: "#3B82F6",
  is_final_positive: false,
  is_final_negative: false,
};

export function PipelineEditor() {
  const { data: stages, isLoading } = usePipelineStages();
  const { data: organization } = useOrganization();
  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();
  const reorderStages = useReorderPipelineStages();
  const applyTemplate = useApplyNicheTemplate();

  const [editingStage, setEditingStage] = useState<EditingStage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [pendingNiche, setPendingNiche] = useState<NicheType | null>(null);

  const handleAddStage = () => {
    setEditingStage(DEFAULT_NEW_STAGE);
    setIsDialogOpen(true);
  };

  const handleEditStage = (stage: PipelineStage) => {
    setEditingStage({
      id: stage.id,
      name: stage.name,
      key: stage.key,
      color: stage.color,
      is_final_positive: stage.is_final_positive,
      is_final_negative: stage.is_final_negative,
    });
    setIsDialogOpen(true);
  };

  const handleSaveStage = async () => {
    if (!editingStage || !organization) return;

    const key = editingStage.key || editingStage.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (editingStage.id) {
      // Update existing
      await updateStage.mutateAsync({
        id: editingStage.id,
        name: editingStage.name,
        key,
        color: editingStage.color,
        is_final_positive: editingStage.is_final_positive,
        is_final_negative: editingStage.is_final_negative,
      });
    } else {
      // Create new
      const maxPosition = stages?.reduce((max, s) => Math.max(max, s.position), 0) || 0;
      await createStage.mutateAsync({
        organization_id: organization.id,
        name: editingStage.name,
        key,
        color: editingStage.color,
        position: maxPosition + 1,
        is_final_positive: editingStage.is_final_positive,
        is_final_negative: editingStage.is_final_negative,
      });
    }

    setIsDialogOpen(false);
    setEditingStage(null);
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;
    await deleteStage.mutateAsync(stageToDelete.id);
    setStageToDelete(null);
  };

  const handleNicheChange = (niche: NicheType) => {
    if (stages && stages.length > 0) {
      setPendingNiche(niche);
      setShowTemplateWarning(true);
    } else {
      applyTemplateNow(niche);
    }
  };

  const applyTemplateNow = async (niche: NicheType) => {
    if (!organization) return;
    await applyTemplate.mutateAsync({ organizationId: organization.id, niche });
    setShowTemplateWarning(false);
    setPendingNiche(null);
  };

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    if (!stages) return;

    const currentIndex = stages.findIndex(s => s.id === stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStages = [...stages];
    [newStages[currentIndex], newStages[newIndex]] = [newStages[newIndex], newStages[currentIndex]];

    const updates = newStages.map((stage, index) => ({
      id: stage.id,
      position: index + 1,
    }));

    await reorderStages.mutateAsync(updates);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const currentNiche = (organization as any)?.niche || 'generic';

  return (
    <div className="space-y-6">
      {/* Niche Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template de Nicho</CardTitle>
          <CardDescription>
            Escolhe um template pré-definido ou personaliza as etapas manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NICHE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleNicheChange(template.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  currentNiche === template.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  currentNiche === template.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {NICHE_ICONS[template.icon]}
                </div>
                <span className="text-sm font-medium text-center">{template.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Etapas do Pipeline</CardTitle>
            <CardDescription>
              Arrasta para reordenar ou edita cada etapa
            </CardDescription>
          </div>
          <Button onClick={handleAddStage} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {stages?.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMoveStage(stage.id, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
                <button
                  onClick={() => handleMoveStage(stage.id, 'down')}
                  disabled={index === stages.length - 1}
                  className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
              </div>

              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{stage.name}</p>
                <p className="text-xs text-muted-foreground">key: {stage.key}</p>
              </div>

              <div className="flex items-center gap-2">
                {stage.is_final_positive && (
                  <span className="text-success text-xs flex items-center gap-1">
                    <Check className="h-3 w-3" /> Ganho
                  </span>
                )}
                {stage.is_final_negative && (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <X className="h-3 w-3" /> Perdido
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditStage(stage)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setStageToDelete(stage)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {(!stages || stages.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma etapa configurada. Escolhe um template ou adiciona etapas manualmente.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStage?.id ? "Editar Etapa" : "Nova Etapa"}
            </DialogTitle>
            <DialogDescription>
              Configura os detalhes da etapa do pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editingStage?.name || ""}
                onChange={(e) => setEditingStage(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Ex: Consulta Marcada"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="color"
                  value={editingStage?.color || "#3B82F6"}
                  onChange={(e) => setEditingStage(prev => prev ? { ...prev, color: e.target.value } : null)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={editingStage?.color || "#3B82F6"}
                  onChange={(e) => setEditingStage(prev => prev ? { ...prev, color: e.target.value } : null)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Etapa de Sucesso</Label>
                <p className="text-xs text-muted-foreground">Conta como conversão</p>
              </div>
              <Switch
                checked={editingStage?.is_final_positive || false}
                onCheckedChange={(checked) => setEditingStage(prev => 
                  prev ? { ...prev, is_final_positive: checked, is_final_negative: checked ? false : prev.is_final_negative } : null
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Etapa de Perda</Label>
                <p className="text-xs text-muted-foreground">Marca como perdido</p>
              </div>
              <Switch
                checked={editingStage?.is_final_negative || false}
                onCheckedChange={(checked) => setEditingStage(prev => 
                  prev ? { ...prev, is_final_negative: checked, is_final_positive: checked ? false : prev.is_final_positive } : null
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveStage}
              disabled={!editingStage?.name || createStage.isPending || updateStage.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!stageToDelete} onOpenChange={() => setStageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. Leads nesta etapa ficarão sem status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Warning */}
      <AlertDialog open={showTemplateWarning} onOpenChange={setShowTemplateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Substituir pipeline?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ao aplicar o template "{pendingNiche && NICHE_LABELS[pendingNiche]}", 
              todas as etapas atuais serão substituídas. 
              Os leads existentes podem ficar com status inválido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingNiche && applyTemplateNow(pendingNiche)}
            >
              Aplicar Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
