import { useState, useMemo } from "react";
import { Search, Users, User, Send, Loader2, Mail, Rocket } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useCreateCampaign, useUpdateCampaignStatus } from "@/hooks/useCampaigns";
import { useSendTemplateEmail } from "@/hooks/useSendTemplateEmail";
import { useClientLabels } from "@/hooks/useClientLabels";
import { CLIENT_STATUS_STYLES } from "@/types/clients";
import type { CrmClient } from "@/types/clients";

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClients, setSelectedClients] = useState<CrmClient[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState<"individual" | "filter">("individual");
  const [isSending, setIsSending] = useState(false);

  const { data: templates = [] } = useEmailTemplates();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const clientLabels = useClientLabels();
  const createCampaign = useCreateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const sendTemplate = useSendTemplateEmail();

  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates]);
  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (!client.email) return false;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        client.name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.company?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const handleToggleClient = (client: CrmClient) => {
    setSelectedClients(prev => {
      const isSelected = prev.some(c => c.id === client.id);
      return isSelected ? prev.filter(c => c.id !== client.id) : [...prev, client];
    });
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients);
    }
  };

  const handleSend = async () => {
    if (!templateId || selectedClients.length === 0 || !name.trim()) return;
    setIsSending(true);

    try {
      // Create campaign
      const campaign = await createCampaign.mutateAsync({ name, template_id: templateId });

      // Update to sending
      await updateStatus.mutateAsync({
        id: campaign.id,
        status: 'sending',
        total_recipients: selectedClients.length,
      });

      // Send emails
      const recipients = selectedClients.map(client => ({
        email: client.email!,
        name: client.name,
        clientId: client.id,
        variables: {
          nome: client.name,
          email: client.email || '',
          empresa: client.company || '',
          telefone: client.phone || '',
        },
      }));

      const result = await sendTemplate.mutateAsync({
        templateId,
        recipients,
        campaignId: campaign.id,
      });

      await updateStatus.mutateAsync({
        id: campaign.id,
        status: result.summary.failed === result.summary.total ? 'failed' : 'sent',
        sent_count: result.summary.sent,
        failed_count: result.summary.failed,
      });

      handleClose();
    } catch {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setName("");
    setTemplateId("");
    setSearchQuery("");
    setSelectedClients([]);
    setStatusFilter("all");
    setSelectionMode("individual");
    setIsSending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Step 1: Name + Template */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Nova Campanha
              </DialogTitle>
              <DialogDescription>Passo 1 de 3 — Nome e template</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da campanha</Label>
                <Input
                  placeholder="Ex: Promoção de Janeiro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Template de email</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">Assunto: {selectedTemplate.subject}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!name.trim() || !templateId}>
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Recipients */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Destinatários</DialogTitle>
              <DialogDescription>Passo 2 de 3 — Selecione quem vai receber</DialogDescription>
            </DialogHeader>

            <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Individual
                </TabsTrigger>
                <TabsTrigger value="filter" className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Por Filtro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <ScrollArea className="flex-1 border rounded-md max-h-[300px]">
                  <div className="p-2 space-y-1">
                    {loadingClients ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : filteredClients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Nenhum cliente encontrado</div>
                    ) : (
                      filteredClients.map((client) => {
                        const isSelected = selectedClients.some(c => c.id === client.id);
                        return (
                          <div key={client.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => handleToggleClient(client)}>
                            <Checkbox checked={isSelected} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{client.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="filter" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Filtrar por {clientLabels.statusFieldLabel.toLowerCase()}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">{clientLabels.statusActive}</SelectItem>
                      <SelectItem value="inactive">{clientLabels.statusInactive}</SelectItem>
                      <SelectItem value="vip">{clientLabels.statusVip}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{filteredClients.length} clientes</p>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedClients.length === filteredClients.length ? "Desmarcar" : "Selecionar"} todos
                  </Button>
                </div>
                <ScrollArea className="flex-1 border rounded-md max-h-[250px]">
                  <div className="p-2 space-y-1">
                    {filteredClients.map((client) => {
                      const isSelected = selectedClients.some(c => c.id === client.id);
                      const statusStyle = CLIENT_STATUS_STYLES[client.status as keyof typeof CLIENT_STATUS_STYLES];
                      return (
                        <div key={client.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => handleToggleClient(client)}>
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs" style={{ backgroundColor: statusStyle?.bg, color: statusStyle?.text }}>
                            {{ active: clientLabels.statusActive, inactive: clientLabels.statusInactive, vip: clientLabels.statusVip }[client.status] || client.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">{selectedClients.length} selecionado(s)</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button onClick={() => setStep(3)} disabled={selectedClients.length === 0}>Continuar</Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Campanha</DialogTitle>
              <DialogDescription>Passo 3 de 3 — Reveja e envie</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Campanha:</span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Template:</span>
                  <span className="text-sm font-medium">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Destinatários:</span>
                  <span className="text-sm font-medium">{selectedClients.length}</span>
                </div>
              </div>

              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-2 space-y-1">
                  {selectedClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 p-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{client.name}</span>
                      <span className="text-muted-foreground">({client.email})</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />Enviar Campanha</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
