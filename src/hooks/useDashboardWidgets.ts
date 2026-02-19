import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  WidgetType, 
  NicheType, 
  getDefaultWidgetsForNiche, 
  filterWidgetsByModules,
  WIDGET_DEFINITIONS 
} from "@/lib/dashboard-templates";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export interface DashboardWidget {
  id: string;
  organization_id: string;
  user_id: string;
  widget_type: WidgetType;
  position: number;
  is_visible: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export function useDashboardWidgets() {
  const { user, organization } = useAuth();
  const { profileDashboardWidgets } = usePermissions();
  const queryClient = useQueryClient();

  const { data: savedWidgets = [], isLoading } = useQuery({
    queryKey: ['dashboard-widgets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as DashboardWidget[];
    },
    enabled: !!user?.id,
  });

  // Get enabled modules from organization
  const enabledModules = (organization?.enabled_modules as Record<string, boolean>) || {
    sales: true,
    proposals: true,
    calendar: true,
    ecommerce: false,
  };

  // If user has no saved widgets, return defaults for their niche
  const niche = (organization?.niche as NicheType) || 'generic';
  
  const defaultWidgetTypes = filterWidgetsByModules(
    getDefaultWidgetsForNiche(niche),
    enabledModules
  );

  // Convert to widget objects with positions
  const defaultWidgets: DashboardWidget[] = defaultWidgetTypes.map((type, index) => ({
    id: `default-${type}`,
    organization_id: organization?.id || '',
    user_id: user?.id || '',
    widget_type: type,
    position: index,
    is_visible: true,
    config: {},
    created_at: new Date().toISOString(),
  }));

  // Build profile-level widgets if available
  const profileWidgets: DashboardWidget[] | null = profileDashboardWidgets
    ? profileDashboardWidgets
        .filter(pw => {
          const def = WIDGET_DEFINITIONS[pw.type as WidgetType];
          if (!def) return false;
          if (def.requiredModule && enabledModules[def.requiredModule] === false) return false;
          return true;
        })
        .map((pw, index) => ({
          id: `profile-${pw.type}`,
          organization_id: organization?.id || '',
          user_id: user?.id || '',
          widget_type: pw.type as WidgetType,
          position: index,
          is_visible: pw.is_visible,
          config: {},
          created_at: new Date().toISOString(),
        }))
    : null;

  // Priority: 1. User saved → 2. Profile defaults → 3. Niche defaults
  const widgets = savedWidgets.length > 0 
    ? savedWidgets.filter(w => {
        const def = WIDGET_DEFINITIONS[w.widget_type as WidgetType];
        if (def?.requiredModule && enabledModules[def.requiredModule] === false) {
          return false;
        }
        return true;
      })
    : profileWidgets || defaultWidgets;

  const visibleWidgets = widgets.filter(w => w.is_visible);
  const hasCustomWidgets = savedWidgets.length > 0;

  // Save widget preferences
  const saveWidgets = useMutation({
    mutationFn: async (widgetsToSave: { type: WidgetType; position: number; is_visible: boolean }[]) => {
      if (!user?.id || !organization?.id) throw new Error('Not authenticated');

      // Delete existing widgets for this user
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('user_id', user.id);

      // Insert new widgets
      const { error } = await supabase
        .from('dashboard_widgets')
        .insert(
          widgetsToSave.map(w => ({
            organization_id: organization.id,
            user_id: user.id,
            widget_type: w.type,
            position: w.position,
            is_visible: w.is_visible,
            config: {},
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      toast.success('Dashboard personalizado guardado');
    },
    onError: () => {
      toast.error('Erro ao guardar preferências');
    },
  });

  // Toggle widget visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ widgetType, isVisible }: { widgetType: WidgetType; isVisible: boolean }) => {
      if (!user?.id || !organization?.id) throw new Error('Not authenticated');

      // If no saved widgets yet, save all defaults first
      if (savedWidgets.length === 0) {
        const widgetsToSave = defaultWidgetTypes.map((type, index) => ({
          type,
          position: index,
          is_visible: type === widgetType ? isVisible : true,
        }));
        
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert(
            widgetsToSave.map(w => ({
              organization_id: organization.id,
              user_id: user.id,
              widget_type: w.type,
              position: w.position,
              is_visible: w.is_visible,
              config: {},
            }))
          );
        
        if (error) throw error;
        return;
      }

      // Check if widget exists
      const existing = savedWidgets.find(w => w.widget_type === widgetType);
      
      if (existing) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update({ is_visible: isVisible })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Add new widget
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert({
            organization_id: organization.id,
            user_id: user.id,
            widget_type: widgetType,
            position: savedWidgets.length,
            is_visible: isVisible,
            config: {},
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  // Reset to defaults
  const resetToDefaults = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      toast.success('Dashboard restaurado para padrão');
    },
  });

  // Reorder widgets
  const reorderWidgets = useMutation({
    mutationFn: async (orderedTypes: WidgetType[]) => {
      if (!user?.id || !organization?.id) throw new Error('Not authenticated');

      // Get current visibility states
      const visibilityMap = new Map(
        widgets.map(w => [w.widget_type, w.is_visible])
      );

      // Delete and re-insert with new positions
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('dashboard_widgets')
        .insert(
          orderedTypes.map((type, index) => ({
            organization_id: organization.id,
            user_id: user.id,
            widget_type: type,
            position: index,
            is_visible: visibilityMap.get(type) ?? true,
            config: {},
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  return {
    widgets,
    visibleWidgets,
    isLoading,
    hasCustomWidgets,
    niche,
    enabledModules,
    saveWidgets,
    toggleVisibility,
    resetToDefaults,
    reorderWidgets,
  };
}
