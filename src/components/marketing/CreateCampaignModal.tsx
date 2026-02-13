import { useState, useMemo } from "react";
import { Search, Users, User, Send, Loader2, Mail, List, ArrowLeft, Check, Circle, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
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
import { useContactLists, useContactListMembers } from "@/hooks/useContactLists";
import { useOrganization } from "@/hooks/useOrganization";
import { normalizeString } from "@/lib/utils";
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
  const [selectionMode, setSelectionMode] = useState<"individual" | "filter" | "list">("individual");
  const [selectedListId, setSelectedListId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: templates = [] } = useEmailTemplates();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const clientLabels = useClientLabels();
  const createCampaign = useCreateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const sendTemplate = useSendTemplateEmail();
  const { data: contactLists = [] } = useContactLists();
  const { data: listMembers = [] } = useContactListMembers(selectedListId || null);
  const { data: org } = useOrganization();

  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates]);
  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (!client.email) return false;
      const q = normalizeString(searchQuery);
      const matchesSearch = !searchQuery ||
        normalizeString(client.name).includes(q) ||
        normalizeString(client.email).includes(q) ||
        normalizeString(client.company || '').includes(q);
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
      const campaign = await createCampaign.mutateAsync({ name, template_id: templateId });

      await updateStatus.mutateAsync({
        id: campaign.id,
        status: 'sending',
        total_recipients: selectedClients.length,
      });

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
    setSelectedListId("");
    setIsSending(false);
    setExpandedSection(null);
    onOpenChange(false);
  };

  const allSectionsComplete = !!name.trim() && !!templateId && selectedClients.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0">
        {/* Step 1: Name + Template */}
        {step === 1 && (
          <>
            <div className="border-b bg-card">
              <div className="max-w-xl mx-auto w-full px-4 md:px-6 py-4 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-lg font-semibold">Criar uma campanha de e-mail</DialogTitle>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
                <div className="space-y-2">
                  <Label>Nome da campanha</Label>
                  <Input
                    placeholder="Ex: Promoção de Janeiro"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 128))}
                  />
                  <p className="text-xs text-muted-foreground text-right">{name.length}/128</p>
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
            </ScrollArea>

            <div className="border-t bg-card px-4 md:px-6 py-4">
              <div className="max-w-xl mx-auto w-full flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={() => setStep(2)} disabled={!name.trim() || !templateId}>
                  Criar campanha
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Config stepper */}
        {step === 2 && (
          <>
            <div className="border-b bg-card">
              <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold truncate">{name}</DialogTitle>
                    <Badge variant="secondary" className="text-xs mt-0.5">Rascunho</Badge>
                  </div>
                </div>
                <Button onClick={() => setStep(3)} disabled={!allSectionsComplete} className="shrink-0">
                  <Send className="mr-2 h-4 w-4" /> Enviar campanha
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-1">
                {/* Remetente */}
                <StepperSection
                  title="Remetente"
                  complete={true}
                  summary={org?.name || 'A sua organização'}
                  expanded={expandedSection === 'sender'}
                  onToggle={() => setExpandedSection(expandedSection === 'sender' ? null : 'sender')}
                >
                  <div className="text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground">{org?.name || '—'}</span></p>
                    <p className="text-xs mt-1">O remetente é configurado nas definições da organização.</p>
                  </div>
                </StepperSection>

                {/* Destinatários */}
                <StepperSection
                  title="Destinatários"
                  complete={selectedClients.length > 0}
                  summary={selectedClients.length > 0 ? `${selectedClients.length} contacto(s) selecionado(s)` : 'Nenhum selecionado'}
                  expanded={expandedSection === 'recipients'}
                  onToggle={() => setExpandedSection(expandedSection === 'recipients' ? null : 'recipients')}
                >
                  <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="individual" className="text-xs gap-1.5">
                        <User className="h-3.5 w-3.5" /> Individual
                      </TabsTrigger>
                      <TabsTrigger value="filter" className="text-xs gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Filtro
                      </TabsTrigger>
                      <TabsTrigger value="list" className="text-xs gap-1.5">
                        <List className="h-3.5 w-3.5" /> Lista
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="individual" className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                      </div>
                      <ScrollArea className="border rounded-md max-h-[300px]">
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

                    <TabsContent value="filter" className="space-y-4">
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
                      <ScrollArea className="border rounded-md max-h-[250px]">
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

                    <TabsContent value="list" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selecionar lista</Label>
                        <Select value={selectedListId} onValueChange={setSelectedListId}>
                          <SelectTrigger><SelectValue placeholder="Escolher lista..." /></SelectTrigger>
                          <SelectContent>
                            {contactLists.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name} ({l.member_count})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedListId && listMembers.length > 0 && (
                        <>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium">{listMembers.length} contacto(s) na lista</p>
                            <Button variant="outline" size="sm" onClick={() => {
                              const clientsFromList = listMembers
                                .filter(m => m.client?.email)
                                .map(m => m.client as CrmClient);
                              setSelectedClients(clientsFromList);
                            }}>
                              Carregar todos
                            </Button>
                          </div>
                          <ScrollArea className="border rounded-md max-h-[200px]">
                            <div className="p-2 space-y-1">
                              {listMembers.filter(m => m.client).map(m => (
                                <div key={m.id} className="flex items-center gap-3 p-2 text-sm">
                                  <span className="font-medium truncate">{m.client?.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">{m.client?.email}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      )}
                      {selectedListId && listMembers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Lista vazia</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </StepperSection>

                {/* Assunto */}
                <StepperSection
                  title="Assunto"
                  complete={!!selectedTemplate}
                  summary={selectedTemplate?.subject || 'Selecione um template primeiro'}
                  expanded={false}
                  onToggle={() => {}}
                />

                {/* Template */}
                <StepperSection
                  title="Template"
                  complete={!!templateId}
                  summary={selectedTemplate?.name || 'Nenhum selecionado'}
                  expanded={expandedSection === 'template'}
                  onToggle={() => setExpandedSection(expandedSection === 'template' ? null : 'template')}
                >
                  <div className="space-y-2">
                    <Label>Alterar template</Label>
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
                  </div>
                </StepperSection>
              </div>
            </ScrollArea>

            <div className="border-t bg-card px-4 md:px-6 py-4 sm:hidden">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{selectedClients.length} destinatário(s)</p>
                <Button onClick={() => setStep(3)} disabled={!allSectionsComplete}>
                  <Send className="mr-2 h-4 w-4" /> Enviar
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <div className="border-b bg-card">
              <div className="max-w-xl mx-auto w-full px-4 md:px-6 py-4 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-lg font-semibold">Confirmar Envio</DialogTitle>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Campanha:</span>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Template:</span>
                    <span className="text-sm font-medium">{selectedTemplate?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Assunto:</span>
                    <span className="text-sm font-medium">{selectedTemplate?.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Destinatários:</span>
                    <span className="text-sm font-medium">{selectedClients.length}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Lista de envio</p>
                  <div className="border rounded-lg divide-y">
                    {selectedClients.map((client) => (
                      <div key={client.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{client.name}</span>
                        <span className="text-muted-foreground text-xs truncate">({client.email})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="border-t bg-card px-4 md:px-6 py-4">
              <div className="max-w-xl mx-auto w-full flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" />Enviar Campanha</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Stepper section component */
function StepperSection({
  title,
  complete,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  complete: boolean;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg bg-card">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {complete ? (
          <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 shrink-0">
            <Circle className="h-full w-full text-transparent" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{summary}</p>
        </div>
        {children && (
          <Button variant="ghost" size="sm" className="shrink-0 text-xs">
            <Pencil className="h-3 w-3 mr-1" /> {expanded ? 'Fechar' : 'Alterar'}
          </Button>
        )}
      </div>
      {expanded && children && (
        <div className="px-4 pb-4 pt-0 border-t">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
