import { useState, useEffect, useMemo } from 'react';
import { Plus, X, RefreshCw, Zap, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useCpes } from '@/hooks/useCpes';
import { useAuth } from '@/contexts/AuthContext';
import { ENERGY_TYPES, ENERGY_COMERCIALIZADORES, type Cpe } from '@/types/cpes';

export interface ProposalCpeDraft {
  id: string;
  existing_cpe_id: string | null;
  equipment_type: string;
  serial_number: string;
  comercializador: string;
  fidelizacao_start: string;
  fidelizacao_end: string;
  notes: string;
  isNew: boolean;
  // Dados de energia por CPE
  consumo_anual: string;
  duracao_contrato: string;
  dbl: string;
  margem: string;
  comissao: string;
  contrato_inicio: string;
  contrato_fim: string;
}

interface ProposalCpeSelectorProps {
  clientId: string | null;
  cpes: ProposalCpeDraft[];
  onCpesChange: (cpes: ProposalCpeDraft[]) => void;
}

// Calcula margem: consumo × duração × DBL / 1000
function calculateMargem(consumo: string, duracao: string, dbl: string): string {
  const c = parseFloat(consumo) || 0;
  const d = parseFloat(duracao) || 0;
  const db = parseFloat(dbl) || 0;
  if (c > 0 && d > 0 && db > 0) {
    return ((c * d * db) / 1000).toFixed(2);
  }
  return '';
}

export function ProposalCpeSelector({ clientId, cpes, onCpesChange }: ProposalCpeSelectorProps) {
  const { data: clientCpes = [] } = useCpes(clientId);
  const { organization } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  
  // Labels for telecom/energy niche
  const typeOptions = ENERGY_TYPES;
  const comercializadorOptions = ENERGY_COMERCIALIZADORES;
  
  // State for new CPE form
  const [equipmentType, setEquipmentType] = useState('');
  const [customEquipmentType, setCustomEquipmentType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [comercializador, setComercializador] = useState('');
  const [customComercializador, setCustomComercializador] = useState('');
  const [consumoAnual, setConsumoAnual] = useState('');
  const [duracaoContrato, setDuracaoContrato] = useState('');
  const [dbl, setDbl] = useState('');
  const [comissao, setComissao] = useState('');
  const [contratoInicio, setContratoInicio] = useState('');
  const [contratoFim, setContratoFim] = useState('');
  const [notes, setNotes] = useState('');
  
  // State for existing CPE update form
  const [selectedExistingCpe, setSelectedExistingCpe] = useState<string | null>(null);
  const [updateConsumoAnual, setUpdateConsumoAnual] = useState('');
  const [updateDuracaoContrato, setUpdateDuracaoContrato] = useState('');
  const [updateDbl, setUpdateDbl] = useState('');
  const [updateComissao, setUpdateComissao] = useState('');
  const [updateContratoInicio, setUpdateContratoInicio] = useState('');
  const [updateContratoFim, setUpdateContratoFim] = useState('');
  const [updateComercializador, setUpdateComercializador] = useState('');
  const [updateCustomComercializador, setUpdateCustomComercializador] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // Auto-calculate margem for new CPE
  const newMargem = useMemo(() => 
    calculateMargem(consumoAnual, duracaoContrato, dbl), 
    [consumoAnual, duracaoContrato, dbl]
  );
  
  // Auto-calculate margem for existing CPE update
  const updateMargem = useMemo(() => 
    calculateMargem(updateConsumoAnual, updateDuracaoContrato, updateDbl), 
    [updateConsumoAnual, updateDuracaoContrato, updateDbl]
  );

  // Auto-calculate contrato fim when start + duration changes
  useEffect(() => {
    if (contratoInicio && duracaoContrato) {
      const start = new Date(contratoInicio);
      const years = parseInt(duracaoContrato) || 0;
      if (years > 0) {
        start.setFullYear(start.getFullYear() + years);
        setContratoFim(start.toISOString().split('T')[0]);
      }
    }
  }, [contratoInicio, duracaoContrato]);
  
  useEffect(() => {
    if (updateContratoInicio && updateDuracaoContrato) {
      const start = new Date(updateContratoInicio);
      const years = parseInt(updateDuracaoContrato) || 0;
      if (years > 0) {
        start.setFullYear(start.getFullYear() + years);
        setUpdateContratoFim(start.toISOString().split('T')[0]);
      }
    }
  }, [updateContratoInicio, updateDuracaoContrato]);

  const resetNewForm = () => {
    setEquipmentType('');
    setCustomEquipmentType('');
    setSerialNumber('');
    setComercializador('');
    setCustomComercializador('');
    setConsumoAnual('');
    setDuracaoContrato('');
    setDbl('');
    setComissao('');
    setContratoInicio('');
    setContratoFim('');
    setNotes('');
  };

  const resetExistingForm = () => {
    setSelectedExistingCpe(null);
    setUpdateConsumoAnual('');
    setUpdateDuracaoContrato('');
    setUpdateDbl('');
    setUpdateComissao('');
    setUpdateContratoInicio('');
    setUpdateContratoFim('');
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
      fidelizacao_start: contratoInicio,
      fidelizacao_end: contratoFim,
      notes: notes,
      isNew: true,
      consumo_anual: consumoAnual,
      duracao_contrato: duracaoContrato,
      dbl: dbl,
      margem: newMargem,
      comissao: comissao,
      contrato_inicio: contratoInicio,
      contrato_fim: contratoFim,
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
      : (updateComercializador === 'keep_current' || !updateComercializador ? existingCpe.comercializador : updateComercializador);

    const updateCpe: ProposalCpeDraft = {
      id: crypto.randomUUID(),
      existing_cpe_id: existingCpe.id,
      equipment_type: existingCpe.equipment_type,
      serial_number: existingCpe.serial_number || '',
      comercializador: finalComercializador,
      fidelizacao_start: updateContratoInicio || existingCpe.fidelizacao_start || '',
      fidelizacao_end: updateContratoFim || existingCpe.fidelizacao_end || '',
      notes: updateNotes,
      isNew: false,
      consumo_anual: updateConsumoAnual,
      duracao_contrato: updateDuracaoContrato,
      dbl: updateDbl,
      margem: updateMargem,
      comissao: updateComissao,
      contrato_inicio: updateContratoInicio,
      contrato_fim: updateContratoFim,
    };

    onCpesChange([...cpes, updateCpe]);
    resetExistingForm();
  };

  const handleRemoveCpe = (id: string) => {
    onCpesChange(cpes.filter(c => c.id !== id));
  };

  const handleUpdateCpeField = (id: string, field: keyof ProposalCpeDraft, value: string) => {
    onCpesChange(cpes.map(cpe => {
      if (cpe.id !== id) return cpe;
      const updated = { ...cpe, [field]: value };
      // Auto-recalculate margem when relevant fields change
      if (['consumo_anual', 'duracao_contrato', 'dbl'].includes(field)) {
        updated.margem = calculateMargem(updated.consumo_anual, updated.duracao_contrato, updated.dbl);
      }
      // Auto-recalculate contrato_fim when start + duration changes
      if ((field === 'contrato_inicio' || field === 'duracao_contrato') && updated.contrato_inicio && updated.duracao_contrato) {
        const start = new Date(updated.contrato_inicio);
        const years = parseInt(updated.duracao_contrato) || 0;
        if (years > 0) {
          start.setFullYear(start.getFullYear() + years);
          updated.contrato_fim = start.toISOString().split('T')[0];
        }
      }
      return updated;
    }));
  };

  // Filter out already selected CPEs from the list
  const availableExistingCpes = clientCpes.filter(
    cpe => !cpes.find(c => c.existing_cpe_id === cpe.id)
  );

  const canAddNew = (equipmentType === 'other' ? customEquipmentType : equipmentType) && 
                    (comercializador === 'other' ? customComercializador : comercializador);
  
  const canAddExisting = selectedExistingCpe !== null;

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
  };

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Zap className="h-4 w-4" />
        CPE/CUI (Pontos de Consumo)
      </Label>

      {/* List of added CPEs with energy data */}
      {cpes.length > 0 && (
        <div className="space-y-4">
          {cpes.map((cpe, index) => (
            <div
              key={cpe.id}
              className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm">CPE/CUI #{index + 1}</span>
                  <Badge variant={cpe.isNew ? 'default' : 'secondary'} className="text-xs">
                    {cpe.isNew ? 'Novo' : 'Renovação'}
                  </Badge>
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
              
              {/* CPE basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Input
                    value={cpe.equipment_type}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'equipment_type', e.target.value)}
                    className="h-8 text-sm"
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comercializador</Label>
                  <Input
                    value={cpe.comercializador}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'comercializador', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPE/CUI</Label>
                  <Input
                    value={cpe.serial_number}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'serial_number', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="PT0002..."
                  />
                </div>
              </div>

              <Separator className="my-3" />
              
              {/* Energy data per CPE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <div className="space-y-1">
                  <Label className="text-xs">Consumo Anual (kWh)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={cpe.consumo_anual}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'consumo_anual', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="15000"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duração (anos)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={cpe.duracao_contrato}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'duracao_contrato', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DBL (€/MWh)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cpe.dbl}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'dbl', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="5.50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Margem (€)
                  </Label>
                  <Input
                    value={cpe.margem}
                    className="h-8 text-sm bg-muted font-medium"
                    disabled
                    placeholder="Auto"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Comissão (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cpe.comissao}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'comissao', e.target.value)}
                    className="h-8 text-sm"
                    placeholder="150"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início Contrato</Label>
                  <Input
                    type="date"
                    value={cpe.contrato_inicio}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'contrato_inicio', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim Contrato</Label>
                  <Input
                    type="date"
                    value={cpe.contrato_fim}
                    onChange={(e) => handleUpdateCpeField(cpe.id, 'contrato_fim', e.target.value)}
                    className="h-8 text-sm bg-muted"
                    disabled
                  />
                </div>
              </div>

              {/* Summary */}
              {cpe.margem && parseFloat(cpe.margem) > 0 && (
                <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200">
                  Margem calculada: <strong>{formatCurrency(cpe.margem)}</strong>
                  {cpe.comissao && ` | Comissão: ${formatCurrency(cpe.comissao)}`}
                </div>
              )}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
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
                  {comercializadorOptions.map((c) => (
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

            <div className="space-y-1">
              <Label className="text-xs">CPE/CUI (opcional)</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="h-9"
                placeholder="PT0002..."
              />
            </div>
          </div>

          <Separator />

          {/* Energy fields for new CPE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Consumo Anual (kWh)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={consumoAnual}
                onChange={(e) => setConsumoAnual(e.target.value)}
                className="h-8"
                placeholder="15000"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duração (anos)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={duracaoContrato}
                onChange={(e) => setDuracaoContrato(e.target.value)}
                className="h-8"
                placeholder="2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">DBL (€/MWh)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={dbl}
                onChange={(e) => setDbl(e.target.value)}
                className="h-8"
                placeholder="5.50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                Margem (€)
              </Label>
              <Input
                value={newMargem}
                className="h-8 bg-muted font-medium"
                disabled
                placeholder="Auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Comissão (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={comissao}
                onChange={(e) => setComissao(e.target.value)}
                className="h-8"
                placeholder="150"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Início Contrato</Label>
              <Input
                type="date"
                value={contratoInicio}
                onChange={(e) => setContratoInicio(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim Contrato</Label>
              <Input
                type="date"
                value={contratoFim}
                className="h-8 bg-muted"
                disabled
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
            Adicionar CPE/CUI
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Novo Comercializador</Label>
                      <Select value={updateComercializador} onValueChange={setUpdateComercializador}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Manter atual..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep_current">Manter atual</SelectItem>
                          {comercializadorOptions.map((c) => (
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
                      <Label className="text-xs">Início Contrato</Label>
                      <Input
                        type="date"
                        value={updateContratoInicio}
                        onChange={(e) => setUpdateContratoInicio(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim Contrato</Label>
                      <Input
                        type="date"
                        value={updateContratoFim}
                        className="h-9 bg-muted"
                        disabled
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Energy fields for existing CPE */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Consumo Anual (kWh)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={updateConsumoAnual}
                        onChange={(e) => setUpdateConsumoAnual(e.target.value)}
                        className="h-8"
                        placeholder="15000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duração (anos)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={updateDuracaoContrato}
                        onChange={(e) => setUpdateDuracaoContrato(e.target.value)}
                        className="h-8"
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">DBL (€/MWh)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={updateDbl}
                        onChange={(e) => setUpdateDbl(e.target.value)}
                        className="h-8"
                        placeholder="5.50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Margem (€)
                      </Label>
                      <Input
                        value={updateMargem}
                        className="h-8 bg-muted font-medium"
                        disabled
                        placeholder="Auto"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Comissão (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={updateComissao}
                      onChange={(e) => setUpdateComissao(e.target.value)}
                      className="h-8 w-full sm:w-1/3"
                      placeholder="150"
                    />
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
