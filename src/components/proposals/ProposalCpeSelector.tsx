import { useState } from 'react';
import { Plus, X, Router, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCpes } from '@/hooks/useCpes';
import { EQUIPMENT_TYPES, COMERCIALIZADORES, type Cpe } from '@/types/cpes';

export interface ProposalCpeDraft {
  id: string;
  existing_cpe_id: string | null;
  equipment_type: string;
  serial_number: string;
  comercializador: string;
  fidelizacao_start: string;
  fidelizacao_end: string;
  notes: string;
  isNew: boolean; // true = novo CPE, false = atualização de CPE existente
}

interface ProposalCpeSelectorProps {
  clientId: string | null;
  cpes: ProposalCpeDraft[];
  onCpesChange: (cpes: ProposalCpeDraft[]) => void;
}

export function ProposalCpeSelector({ clientId, cpes, onCpesChange }: ProposalCpeSelectorProps) {
  const { data: clientCpes = [] } = useCpes(clientId);
  
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  
  // State for new CPE form
  const [equipmentType, setEquipmentType] = useState('');
  const [customEquipmentType, setCustomEquipmentType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [comercializador, setComercializador] = useState('');
  const [customComercializador, setCustomComercializador] = useState('');
  const [fidelizacaoStart, setFidelizacaoStart] = useState('');
  const [fidelizacaoEnd, setFidelizacaoEnd] = useState('');
  const [notes, setNotes] = useState('');
  
  // State for existing CPE update form
  const [selectedExistingCpe, setSelectedExistingCpe] = useState<string | null>(null);
  const [updateFidelizacaoStart, setUpdateFidelizacaoStart] = useState('');
  const [updateFidelizacaoEnd, setUpdateFidelizacaoEnd] = useState('');
  const [updateComercializador, setUpdateComercializador] = useState('');
  const [updateCustomComercializador, setUpdateCustomComercializador] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const resetNewForm = () => {
    setEquipmentType('');
    setCustomEquipmentType('');
    setSerialNumber('');
    setComercializador('');
    setCustomComercializador('');
    setFidelizacaoStart('');
    setFidelizacaoEnd('');
    setNotes('');
  };

  const resetExistingForm = () => {
    setSelectedExistingCpe(null);
    setUpdateFidelizacaoStart('');
    setUpdateFidelizacaoEnd('');
    setUpdateComercializador('');
    setUpdateCustomComercializador('');
    setUpdateNotes('');
  };

  const handleAddNewCpe = () => {
    const finalEquipmentType = equipmentType === 'other' ? customEquipmentType : equipmentType;
    const finalComercializador = comercializador === 'other' ? customComercializador : comercializador;
    
    if (!finalEquipmentType || !finalComercializador) return;

    const newCpe: ProposalCpeDraft = {
      id: crypto.randomUUID(),
      existing_cpe_id: null,
      equipment_type: finalEquipmentType,
      serial_number: serialNumber,
      comercializador: finalComercializador,
      fidelizacao_start: fidelizacaoStart,
      fidelizacao_end: fidelizacaoEnd,
      notes: notes,
      isNew: true,
    };

    onCpesChange([...cpes, newCpe]);
    resetNewForm();
  };

  const handleAddExistingCpe = () => {
    if (!selectedExistingCpe) return;
    
    const existingCpe = clientCpes.find(c => c.id === selectedExistingCpe);
    if (!existingCpe) return;

    // Check if already added
    if (cpes.find(c => c.existing_cpe_id === selectedExistingCpe)) {
      return;
    }

    const finalComercializador = updateComercializador === 'other' 
      ? updateCustomComercializador 
      : (updateComercializador || existingCpe.comercializador);

    const updateCpe: ProposalCpeDraft = {
      id: crypto.randomUUID(),
      existing_cpe_id: existingCpe.id,
      equipment_type: existingCpe.equipment_type,
      serial_number: existingCpe.serial_number || '',
      comercializador: finalComercializador,
      fidelizacao_start: updateFidelizacaoStart || existingCpe.fidelizacao_start || '',
      fidelizacao_end: updateFidelizacaoEnd || existingCpe.fidelizacao_end || '',
      notes: updateNotes,
      isNew: false,
    };

    onCpesChange([...cpes, updateCpe]);
    resetExistingForm();
  };

  const handleRemoveCpe = (id: string) => {
    onCpesChange(cpes.filter(c => c.id !== id));
  };

  // Filter out already selected CPEs from the list
  const availableExistingCpes = clientCpes.filter(
    cpe => !cpes.find(c => c.existing_cpe_id === cpe.id)
  );

  const canAddNew = (equipmentType === 'other' ? customEquipmentType : equipmentType) && 
                    (comercializador === 'other' ? customComercializador : comercializador);
  
  const canAddExisting = selectedExistingCpe !== null;

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Router className="h-4 w-4" />
        CPEs (Equipamentos)
      </Label>

      {/* List of added CPEs */}
      {cpes.length > 0 && (
        <div className="space-y-2 mb-4">
          {cpes.map((cpe) => (
            <div
              key={cpe.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{cpe.equipment_type}</span>
                    <Badge variant={cpe.isNew ? 'default' : 'secondary'} className="text-xs">
                      {cpe.isNew ? 'Novo' : 'Renovação'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {cpe.comercializador}
                    {cpe.serial_number && ` • ${cpe.serial_number}`}
                    {cpe.fidelizacao_end && ` • Até ${cpe.fidelizacao_end}`}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveCpe(cpe.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add CPE Form */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'existing')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="h-3 w-3" />
            Novo CPE
          </TabsTrigger>
          <TabsTrigger value="existing" className="flex items-center gap-2" disabled={!clientId}>
            <RefreshCw className="h-3 w-3" />
            Renovar Existente
          </TabsTrigger>
        </TabsList>

        {/* New CPE Tab */}
        <TabsContent value="new" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Equipamento</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                  <SelectItem value="other">Outro...</SelectItem>
                </SelectContent>
              </Select>
              {equipmentType === 'other' && (
                <Input
                  placeholder="Tipo personalizado..."
                  value={customEquipmentType}
                  onChange={(e) => setCustomEquipmentType(e.target.value)}
                  className="h-8 mt-1"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Comercializador</Label>
              <Select value={comercializador} onValueChange={setComercializador}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {COMERCIALIZADORES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="other">Outro...</SelectItem>
                </SelectContent>
              </Select>
              {comercializador === 'other' && (
                <Input
                  placeholder="Comercializador..."
                  value={customComercializador}
                  onChange={(e) => setCustomComercializador(e.target.value)}
                  className="h-8 mt-1"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nº Série (opcional)</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="h-9"
                placeholder="S/N..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Início Fidelização</Label>
              <Input
                type="date"
                value={fidelizacaoStart}
                onChange={(e) => setFidelizacaoStart(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim Fidelização</Label>
              <Input
                type="date"
                value={fidelizacaoEnd}
                onChange={(e) => setFidelizacaoEnd(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNewCpe}
            disabled={!canAddNew}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar CPE
          </Button>
        </TabsContent>

        {/* Existing CPE Tab */}
        <TabsContent value="existing" className="space-y-3 mt-3">
          {!clientId ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Selecione um cliente para ver os CPEs existentes
            </p>
          ) : availableExistingCpes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum CPE disponível para este cliente
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Selecionar CPE do Cliente</Label>
                <Select value={selectedExistingCpe || ''} onValueChange={setSelectedExistingCpe}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar CPE existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExistingCpes.map((cpe) => (
                      <SelectItem key={cpe.id} value={cpe.id}>
                        {cpe.equipment_type} - {cpe.comercializador}
                        {cpe.serial_number && ` (${cpe.serial_number})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExistingCpe && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Novo Comercializador</Label>
                      <Select value={updateComercializador} onValueChange={setUpdateComercializador}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Manter atual..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Manter atual</SelectItem>
                          {COMERCIALIZADORES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                          <SelectItem value="other">Outro...</SelectItem>
                        </SelectContent>
                      </Select>
                      {updateComercializador === 'other' && (
                        <Input
                          placeholder="Comercializador..."
                          value={updateCustomComercializador}
                          onChange={(e) => setUpdateCustomComercializador(e.target.value)}
                          className="h-8 mt-1"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nova Data Início</Label>
                      <Input
                        type="date"
                        value={updateFidelizacaoStart}
                        onChange={(e) => setUpdateFidelizacaoStart(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nova Data Fim</Label>
                      <Input
                        type="date"
                        value={updateFidelizacaoEnd}
                        onChange={(e) => setUpdateFidelizacaoEnd(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddExistingCpe}
                    disabled={!canAddExisting}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Adicionar Renovação
                  </Button>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
