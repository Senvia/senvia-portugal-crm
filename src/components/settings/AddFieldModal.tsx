import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Type, 
  Hash, 
  List, 
  CheckSquare, 
  AlignLeft,
  Plus,
  X 
} from 'lucide-react';
import { CustomField, FieldType, FIELD_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

interface AddFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: Omit<CustomField, 'id' | 'order'>) => void;
  initialField?: CustomField;
  isEditing?: boolean;
}

const FIELD_TYPES: { type: FieldType; icon: typeof Type; description: string }[] = [
  { type: 'text', icon: Type, description: 'Campo de texto simples' },
  { type: 'number', icon: Hash, description: 'Apenas números' },
  { type: 'select', icon: List, description: 'Lista de opções' },
  { type: 'checkbox', icon: CheckSquare, description: 'Sim ou Não' },
  { type: 'textarea', icon: AlignLeft, description: 'Texto longo' },
];

export function AddFieldModal({ 
  open, 
  onOpenChange, 
  onAdd, 
  initialField,
  isEditing = false 
}: AddFieldModalProps) {
  const [type, setType] = useState<FieldType>('text');
  const [label, setLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(['']);

  // Reset form when opening/closing or when initialField changes
  useEffect(() => {
    if (open && initialField) {
      setType(initialField.type);
      setLabel(initialField.label);
      setPlaceholder(initialField.placeholder || '');
      setRequired(initialField.required);
      setOptions(initialField.options?.length ? initialField.options : ['']);
    } else if (open && !initialField) {
      setType('text');
      setLabel('');
      setPlaceholder('');
      setRequired(false);
      setOptions(['']);
    }
  }, [open, initialField]);

  const handleSubmit = () => {
    if (!label.trim()) return;

    const field: Omit<CustomField, 'id' | 'order'> = {
      type,
      label: label.trim(),
      placeholder: placeholder.trim() || undefined,
      required,
      options: type === 'select' ? options.filter(o => o.trim()) : undefined,
    };

    onAdd(field);
    onOpenChange(false);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const showPlaceholder = type === 'text' || type === 'number' || type === 'textarea';
  const showOptions = type === 'select';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Campo' : 'Adicionar Campo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere as propriedades do campo personalizado.'
              : 'Configure um novo campo personalizado para o formulário.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de Campo</Label>
            <div className="grid grid-cols-5 gap-2">
              {FIELD_TYPES.map(({ type: fieldType, icon: Icon, description }) => (
                <button
                  key={fieldType}
                  type="button"
                  onClick={() => setType(fieldType)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all hover:bg-muted/50",
                    type === fieldType && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                  title={description}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    type === fieldType ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    type === fieldType ? "text-primary" : "text-muted-foreground"
                  )}>
                    {FIELD_TYPE_LABELS[fieldType]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">Label *</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Empresa, Orçamento..."
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Placeholder */}
          {showPlaceholder && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Texto de exemplo"
                maxLength={100}
              />
            </div>
          )}

          {/* Options for Select */}
          {showOptions && (
            <div className="space-y-3">
              <Label>Opções *</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <Input
                      value={option}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Opção ${idx + 1}`}
                      maxLength={100}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeOption(idx)}
                      disabled={options.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Opção
              </Button>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="field-required" className="font-medium cursor-pointer">
                Campo Obrigatório
              </Label>
              <p className="text-xs text-muted-foreground">
                O visitante terá de preencher este campo
              </p>
            </div>
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!label.trim() || (showOptions && options.filter(o => o.trim()).length === 0)}
          >
            {isEditing ? 'Guardar Alterações' : 'Adicionar Campo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
