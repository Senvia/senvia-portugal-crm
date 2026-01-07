import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Hash, 
  List, 
  CheckSquare, 
  AlignLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Asterisk,
  Mail,
  Phone,
} from 'lucide-react';
import { FormSettings, CustomField, FieldType, FIELD_TYPE_LABELS } from '@/types';
import { AddFieldModal } from './AddFieldModal';
import { cn } from '@/lib/utils';

interface CustomFieldsEditorProps {
  settings: FormSettings;
  onUpdateSettings: (settings: FormSettings) => void;
}

const FIELD_ICONS: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: List,
  checkbox: CheckSquare,
  textarea: AlignLeft,
};

type FixedFieldKey = 'name' | 'email' | 'phone' | 'message';

const FIXED_FIELD_ICONS: Record<FixedFieldKey, React.ComponentType<{ className?: string }>> = {
  name: Type,
  email: Mail,
  phone: Phone,
  message: AlignLeft,
};

export function CustomFieldsEditor({ settings, onUpdateSettings }: CustomFieldsEditorProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  // Update fixed field configuration
  const updateFixedField = (
    fieldKey: FixedFieldKey,
    updates: Partial<{ visible: boolean; required: boolean; label: string }>
  ) => {
    onUpdateSettings({
      ...settings,
      fields: {
        ...settings.fields,
        [fieldKey]: {
          ...settings.fields[fieldKey],
          ...updates,
        },
      },
    });
  };

  const addField = (field: Omit<CustomField, 'id' | 'order'>) => {
    const newField: CustomField = {
      ...field,
      id: crypto.randomUUID(),
      order: settings.custom_fields.length,
    };
    onUpdateSettings({
      ...settings,
      custom_fields: [...settings.custom_fields, newField],
    });
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onUpdateSettings({
      ...settings,
      custom_fields: settings.custom_fields.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ),
    });
  };

  const removeField = (id: string) => {
    onUpdateSettings({
      ...settings,
      custom_fields: settings.custom_fields
        .filter(f => f.id !== id)
        .map((f, idx) => ({ ...f, order: idx })),
    });
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const fields = [...settings.custom_fields];
    const idx = fields.findIndex(f => f.id === id);
    if (idx === -1) return;
    
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    
    [fields[idx], fields[targetIdx]] = [fields[targetIdx], fields[idx]];
    onUpdateSettings({
      ...settings,
      custom_fields: fields.map((f, i) => ({ ...f, order: i })),
    });
  };

  const sortedCustomFields = [...settings.custom_fields].sort((a, b) => a.order - b.order);

  const renderFixedField = (fieldKey: FixedFieldKey, icon: React.ComponentType<{ className?: string }>) => {
    const field = settings.fields[fieldKey];
    const Icon = icon;
    
    return (
      <div 
        key={fieldKey}
        className={cn(
          "flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3 transition-colors",
          field.visible ? "bg-card" : "bg-muted/50 opacity-60"
        )}
      >
        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => updateFixedField(fieldKey, { visible: !field.visible })}
          className={cn(
            "p-1.5 rounded-md transition-colors shrink-0",
            field.visible 
              ? "text-primary hover:bg-primary/10" 
              : "text-muted-foreground hover:bg-muted"
          )}
          title={field.visible ? "Ocultar campo" : "Mostrar campo"}
        >
          {field.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        
        {/* Required Toggle (only if visible) */}
        <button
          type="button"
          onClick={() => field.visible && updateFixedField(fieldKey, { required: !field.required })}
          disabled={!field.visible}
          className={cn(
            "p-1.5 rounded-md transition-colors shrink-0",
            !field.visible && "opacity-30 cursor-not-allowed",
            field.required 
              ? "text-amber-500 hover:bg-amber-500/10" 
              : "text-muted-foreground hover:bg-muted"
          )}
          title={field.required ? "Tornar opcional" : "Tornar obrigatório"}
        >
          <Asterisk className="h-4 w-4" />
        </button>
        
        {/* Field Icon */}
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        
        {/* Label Input */}
        <Input
          value={field.label}
          onChange={(e) => updateFixedField(fieldKey, { label: e.target.value })}
          disabled={!field.visible}
          className="flex-1 min-w-0 h-9"
          placeholder="Label do campo"
          maxLength={50}
        />
        
        {/* Status Badge */}
        <Badge 
          variant={field.visible ? (field.required ? "default" : "outline") : "secondary"}
          className="shrink-0 hidden sm:flex"
        >
          {!field.visible ? 'Oculto' : field.required ? 'Obrigatório' : 'Opcional'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Fixed Fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Campos Base</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Clique nos ícones 👁 e * para configurar visibilidade e obrigatoriedade
        </p>
        <div className="space-y-2">
          {renderFixedField('name', FIXED_FIELD_ICONS.name)}
          {renderFixedField('email', FIXED_FIELD_ICONS.email)}
          {renderFixedField('phone', FIXED_FIELD_ICONS.phone)}
          {renderFixedField('message', FIXED_FIELD_ICONS.message)}
        </div>
      </div>

      {/* Custom Fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Campos Personalizados</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {sortedCustomFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Sem campos personalizados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione campos para recolher mais informação
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCustomFields.map((field, idx) => {
              const Icon = FIELD_ICONS[field.type];
              return (
                <div 
                  key={field.id} 
                  className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary shrink-0">
                    <Icon className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {FIELD_TYPE_LABELS[field.type]}
                      {field.required && ' • Obrigatório'}
                      {field.type === 'select' && field.options && ` • ${field.options.length} opções`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveField(field.id, 'up')}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveField(field.id, 'down')}
                      disabled={idx === sortedCustomFields.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingField(field)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Campo
        </Button>
      </div>

      {/* Add Field Modal */}
      <AddFieldModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdd={addField}
      />

      {/* Edit Field Modal */}
      {editingField && (
        <AddFieldModal
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          onAdd={(updates) => {
            updateField(editingField.id, updates);
            setEditingField(null);
          }}
          initialField={editingField}
          isEditing
        />
      )}
    </div>
  );
}