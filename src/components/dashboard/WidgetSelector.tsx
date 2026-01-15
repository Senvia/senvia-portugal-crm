import { useState, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, GripVertical } from "lucide-react";
import { 
  WIDGET_DEFINITIONS, 
  WidgetType, 
  NicheType,
  getWidgetTitle,
  filterWidgetsByModules,
  getAllAvailableWidgets,
} from "@/lib/dashboard-templates";
import { DashboardWidget } from "@/hooks/useDashboardWidgets";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidget[];
  niche: NicheType;
  enabledModules: Record<string, boolean>;
  onSave: (widgets: { type: WidgetType; position: number; is_visible: boolean }[]) => void;
  onReset: () => void;
}

interface SortableWidgetItemProps {
  id: string;
  widgetType: WidgetType;
  niche: NicheType;
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}

function SortableWidgetItem({ id, widgetType, niche, isVisible, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const definition = WIDGET_DEFINITIONS[widgetType];
  const Icon = definition?.icon;
  const title = getWidgetTitle(widgetType, niche);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <Checkbox
        id={`widget-${widgetType}`}
        checked={isVisible}
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      
      <Label 
        htmlFor={`widget-${widgetType}`}
        className="flex items-center gap-2 flex-1 cursor-pointer"
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm">{title}</span>
      </Label>

      {definition?.requiredModule && (
        <Badge variant="secondary" className="text-xs">
          {definition.requiredModule}
        </Badge>
      )}
    </div>
  );
}

export function WidgetSelector({
  open,
  onOpenChange,
  widgets,
  niche,
  enabledModules,
  onSave,
  onReset,
}: WidgetSelectorProps) {
  // Get all available widgets filtered by enabled modules
  const availableWidgets = useMemo(() => {
    const allTypes = getAllAvailableWidgets().map(w => w.type);
    return filterWidgetsByModules(allTypes, enabledModules);
  }, [enabledModules]);

  // Initialize local state from current widgets
  const [localWidgets, setLocalWidgets] = useState<{ type: WidgetType; is_visible: boolean }[]>(() => {
    // Start with current widgets order
    const currentOrder = widgets.map(w => ({
      type: w.widget_type as WidgetType,
      is_visible: w.is_visible,
    }));

    // Add any missing widgets from available list
    availableWidgets.forEach(type => {
      if (!currentOrder.find(w => w.type === type)) {
        currentOrder.push({ type, is_visible: false });
      }
    });

    return currentOrder;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex(i => i.type === active.id);
        const newIndex = items.findIndex(i => i.type === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggle = (widgetType: WidgetType, isVisible: boolean) => {
    setLocalWidgets(prev => 
      prev.map(w => 
        w.type === widgetType ? { ...w, is_visible: isVisible } : w
      )
    );
  };

  const handleSave = () => {
    onSave(
      localWidgets.map((w, index) => ({
        type: w.type,
        position: index,
        is_visible: w.is_visible,
      }))
    );
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  const visibleCount = localWidgets.filter(w => w.is_visible).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>
            Escolha quais widgets quer ver e arraste para reordenar.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {visibleCount} de {localWidgets.length} widgets visíveis
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>

          <ScrollArea className="h-[60vh] pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localWidgets.map(w => w.type)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localWidgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.type}
                      id={widget.type}
                      widgetType={widget.type}
                      niche={niche}
                      isVisible={widget.is_visible}
                      onToggle={(visible) => handleToggle(widget.type, visible)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
