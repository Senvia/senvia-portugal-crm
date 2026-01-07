import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Pencil,
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { CustomField, FieldType, FIELD_TYPE_LABELS, FormSettings } from '@/types';
import { AddFieldModal } from './AddFieldModal';
import { cn } from '@/lib/utils';

interface CustomFieldsEditorProps {
  settings: FormSettings;
  onUpdateSettings: (settings: FormSettings) => void;
}

const FIELD_ICONS: Record<FieldType, typeof Type> = {
  text: Type,
  number: Hash,
  select: List,
  checkbox: CheckSquare,
  textarea: AlignLeft,
};

export function CustomFieldsEditor({ settings, onUpdateSettings }: CustomFieldsEditorProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const updateLabel = (key: keyof FormSettings['labels'], value: string) => {
    onUpdateSettings({
      ...settings,
      labels: { ...settings.labels, [key]: value }
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

  return (
    <div className="space-y-6">
      {/* Fixed Fields Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Campos Fixos</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          {/* Name Field */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Type className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={settings.labels.name}
              onChange={(e) => updateLabel('name', e.target.value)}
              className="h-9 flex-1"
              maxLength={50}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Obrigatório</span>
          </div>

          {/* Email Field */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Type className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={settings.labels.email}
              onChange={(e) => updateLabel('email', e.target.value)}
              className="h-9 flex-1"
              maxLength={50}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Obrigatório</span>
          </div>

          {/* Phone Field */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Type className="h-4 w-4 text-primary" />
            </div>
            <Input
              value={settings.labels.phone}
              onChange={(e) => updateLabel('phone', e.target.value)}
              className="h-9 flex-1"
              maxLength={50}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Obrigatório</span>
          </div>

          {/* Message Field (Toggle) */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={settings.labels.message}
              onChange={(e) => updateLabel('message', e.target.value)}
              className="h-9 flex-1"
              maxLength={50}
              disabled={!settings.show_message_field}
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.show_message_field}
                onCheckedChange={(checked) => 
                  onUpdateSettings({ ...settings, show_message_field: checked })
                }
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {settings.show_message_field ? 'Visível' : 'Oculto'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields Section */}
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
                  <div className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
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
