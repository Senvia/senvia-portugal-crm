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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateCpe } from '@/hooks/useCpes';
import { EQUIPMENT_TYPES, COMERCIALIZADORES, type Cpe, type CpeStatus } from '@/types/cpes';

interface EditCpeModalProps {
  cpe: Cpe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCpeModal({ cpe, open, onOpenChange }: EditCpeModalProps) {
  const updateCpe = useUpdateCpe();
  
  const [equipmentType, setEquipmentType] = useState('');
  const [customEquipmentType, setCustomEquipmentType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [comercializador, setComercializador] = useState('');
  const [customComercializador, setCustomComercializador] = useState('');
  const [fidelizacaoStart, setFidelizacaoStart] = useState('');
  const [fidelizacaoEnd, setFidelizacaoEnd] = useState('');
  const [status, setStatus] = useState<CpeStatus>('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (cpe && open) {
      // Check if equipment type is in predefined list
      if (EQUIPMENT_TYPES.includes(cpe.equipment_type)) {
        setEquipmentType(cpe.equipment_type);
        setCustomEquipmentType('');
      } else {
        setEquipmentType('Outro');
        setCustomEquipmentType(cpe.equipment_type);
      }

      // Check if comercializador is in predefined list
      if (COMERCIALIZADORES.includes(cpe.comercializador)) {
        setComercializador(cpe.comercializador);
        setCustomComercializador('');
      } else {
        setComercializador('Outro');
        setCustomComercializador(cpe.comercializador);
      }

      setSerialNumber(cpe.serial_number || '');
      setFidelizacaoStart(cpe.fidelizacao_start || '');
      setFidelizacaoEnd(cpe.fidelizacao_end || '');
      setStatus(cpe.status as CpeStatus);
      setNotes(cpe.notes || '');
    }
  }, [cpe, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalEquipmentType = equipmentType === 'Outro' ? customEquipmentType : equipmentType;
    const finalComercializador = comercializador === 'Outro' ? customComercializador : comercializador;

    if (!finalEquipmentType || !finalComercializador) return;

    updateCpe.mutate({
      id: cpe.id,
      equipment_type: finalEquipmentType,
      serial_number: serialNumber || null,
      comercializador: finalComercializador,
      fidelizacao_start: fidelizacaoStart || null,
      fidelizacao_end: fidelizacaoEnd || null,
      status,
      notes: notes || null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  const isValid = (equipmentType === 'Outro' ? customEquipmentType : equipmentType) && 
                  (comercializador === 'Outro' ? customComercializador : comercializador);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar CPE</DialogTitle>
          <DialogDescription>
            Atualize os dados do equipamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Equipment Type */}
          <div className="space-y-2">
            <Label>Tipo de Equipamento *</Label>
            <Select value={equipmentType} onValueChange={setEquipmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {equipmentType === 'Outro' && (
              <Input
                placeholder="Especifique o tipo"
                value={customEquipmentType}
                onChange={(e) => setCustomEquipmentType(e.target.value)}
              />
            )}
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label>Número de Série</Label>
            <Input
              placeholder="Ex: SN123456789"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          {/* Comercializador */}
          <div className="space-y-2">
            <Label>Comercializador *</Label>
            <Select value={comercializador} onValueChange={setComercializador}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o comercializador" />
              </SelectTrigger>
              <SelectContent>
                {COMERCIALIZADORES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {comercializador === 'Outro' && (
              <Input
                placeholder="Nome do comercializador"
                value={customComercializador}
                onChange={(e) => setCustomComercializador(e.target.value)}
              />
            )}
          </div>

          {/* Fidelização */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início Fidelização</Label>
              <Input
                type="date"
                value={fidelizacaoStart}
                onChange={(e) => setFidelizacaoStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim Fidelização</Label>
              <Input
                type="date"
                value={fidelizacaoEnd}
                onChange={(e) => setFidelizacaoEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CpeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="returned">Devolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observações sobre o equipamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || updateCpe.isPending}>
              {updateCpe.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
