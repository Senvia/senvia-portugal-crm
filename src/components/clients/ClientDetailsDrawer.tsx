import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  ShoppingCart,
  Edit,
  MessageSquare,
  Plus,
  Calendar as CalendarIcon,
  Save,
  X,
  User,
  Router,
  Zap,
  Euro,
} from "lucide-react";
import { formatDate, formatCurrency, getWhatsAppUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientLabels } from "@/hooks/useClientLabels";
import { useClientHistory } from "@/hooks/useClientHistory";
import { useUpdateClient } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeam";
import { useCpes } from "@/hooks/useCpes";
import { useAuth } from "@/contexts/AuthContext";
import { ClientTimeline } from "./ClientTimeline";
import { AddCommunicationModal } from "./AddCommunicationModal";
import { CpeList } from "./CpeList";
import type { CrmClient } from "@/types/clients";
import type { CommunicationType, CommunicationDirection } from "@/types/communications";

interface ClientDetailsDrawerProps {
  client: CrmClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: CrmClient) => void;
  onNewProposal?: (client: CrmClient) => void;
  onNewSale?: (client: CrmClient) => void;
  onScheduleMeeting?: (client: CrmClient) => void;
}

export function ClientDetailsDrawer({ 
  client, 
  open, 
  onOpenChange, 
  onEdit,
  onNewProposal,
  onNewSale,
  onScheduleMeeting
}: ClientDetailsDrawerProps) {
  const labels = useClientLabels();
  const { timeline, proposals, sales, events, isLoading: loadingHistory } = useClientHistory(client?.id || null);
  const updateClient = useUpdateClient();
  const { data: teamMembers = [] } = useTeamMembers();
  const { organization } = useAuth();
  
  const isTelecom = organization?.niche === 'telecom';
  const { data: cpes = [] } = useCpes(isTelecom ? client?.id : null);
  const CpeIcon = isTelecom ? Zap : Router;

  const [showAddCommunication, setShowAddCommunication] = useState(false);
  const [defaultCommType, setDefaultCommType] = useState<CommunicationType>('note');
  const [defaultCommDirection, setDefaultCommDirection] = useState<CommunicationDirection>('outbound');

  const getTeamMemberName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.full_name || null;
  };

  const handleOpenCommunicationModal = (type: CommunicationType = 'note', direction: CommunicationDirection = 'outbound') => {
    setDefaultCommType(type);
    setDefaultCommDirection(direction);
    setShowAddCommunication(true);
  };

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  useEffect(() => {
    if (client && !isEditingNotes) {
      setEditedNotes(client.notes || "");
    }
  }, [client, isEditingNotes]);

  if (!client) return null;

  const handleSaveNotes = () => {
    if (editedNotes !== (client.notes || "")) {
      updateClient.mutate({ id: client.id, notes: editedNotes || null });
    }
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setEditedNotes(client.notes || "");
    setIsEditingNotes(false);
  };

  const statusStyle = {
    active: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
    inactive: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
    vip: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  }[client.status] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' };

  const statusLabel = {
    active: labels.statusActive,
    inactive: labels.statusInactive,
    vip: labels.statusVip,
  }[client.status] || client.status;

  const sourceLabel = {
    lead: 'Lead Convertido',
    referral: 'Indicação',
    direct: 'Contacto Direto',
    website: 'Website',
    other: 'Outro',
  }[client.source || ''] || client.source;

  const hasAddress = client.address_line1 || client.city || client.postal_code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-lg">{client.name}</DialogTitle>
                <DialogDescription className="sr-only">Detalhes do cliente {client.name}</DialogDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-4">
              {/* Card de Contexto */}
                <Card>
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      {client.code && (
                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-semibold">
                          #{client.code}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {labels.since} {formatDate(client.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', statusStyle.bg, statusStyle.text, statusStyle.border)}>
                        {statusLabel}
                      </Badge>
                      {client.source && (
                        <Badge variant="secondary" className="text-xs">{sourceLabel}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dados do Cliente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados do {labels.singular}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{labels.statusFieldLabel}</span>
                      <Badge variant="outline" className={cn('text-xs', statusStyle.bg, statusStyle.text, statusStyle.border)}>
                        {statusLabel}
                      </Badge>
                    </div>
                    {client.source && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Origem</span>
                        <Badge variant="secondary" className="text-xs">{sourceLabel}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Data de Criação</span>
                      <span>{formatDate(client.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Contacto */}
                {(client.email || client.phone) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {client.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                            {client.email}
                          </a>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{client.phone}</span>
                          <a
                            href={getWhatsAppUrl(client.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success hover:underline text-xs ml-auto"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Empresa */}
                {(client.company || client.nif) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Empresa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {client.company && (
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{client.company}</span>
                        </div>
                      )}
                      {client.nif && (
                        <div className="flex items-center gap-3 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>NIF: {client.nif}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Morada */}
                {hasAddress && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Morada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          {client.address_line1 && <p>{client.address_line1}</p>}
                          {client.address_line2 && <p>{client.address_line2}</p>}
                          {(client.postal_code || client.city) && (
                            <p>
                              {client.postal_code && `${client.postal_code} `}
                              {client.city}
                            </p>
                          )}
                          {client.country && <p>{client.country}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CPEs - Telecom only */}
                {isTelecom && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CpeIcon className="h-4 w-4" />
                        CPE/CUI ({cpes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CpeList clientId={client.id} />
                    </CardContent>
                  </Card>
                )}

                {/* Notas */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Notas</CardTitle>
                      {!isEditingNotes ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelNotes}>
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button variant="default" size="sm" onClick={handleSaveNotes} disabled={updateClient.isPending}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        placeholder="Adicionar notas sobre este cliente..."
                        className="min-h-[120px]"
                      />
                    ) : (
                      <div 
                        className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[80px] p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        {client.notes || "Clique para adicionar notas..."}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Histórico / Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Histórico</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenCommunicationModal('note', 'outbound')}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Registar Contacto
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ClientTimeline events={timeline} isLoading={loadingHistory} />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Sticky */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-0 space-y-4">
                  {/* Métricas */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Métricas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xl font-bold text-primary">{client.total_proposals}</p>
                          <p className="text-xs text-muted-foreground">Propostas</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xl font-bold text-success">{client.total_sales}</p>
                          <p className="text-xs text-muted-foreground">Vendas</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-xl font-bold">{formatCurrency(client.total_value)}</p>
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ações Rápidas */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {client.phone && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <a href={`tel:${client.phone}`}>
                              <Phone className="h-4 w-4 mr-1" />
                              Ligar
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-success border-success/20 hover:bg-success/10" asChild>
                            <a href={getWhatsAppUrl(client.phone)} target="_blank" rel="noopener noreferrer">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              WhatsApp
                            </a>
                          </Button>
                        </div>
                      )}
                      {client.email && (
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={`mailto:${client.email}`}>
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </a>
                        </Button>
                      )}
                      <Separator />
                      {onNewProposal && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onNewProposal(client)}>
                          <FileText className="h-4 w-4 mr-1" />
                          Nova Proposta
                        </Button>
                      )}
                      {onNewSale && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onNewSale(client)}>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Nova Venda
                        </Button>
                      )}
                      {onScheduleMeeting && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onScheduleMeeting(client)}>
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Agendar
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vendedor Responsável */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Vendedor Responsável</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getTeamMemberName(client.assigned_to) ? (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{getTeamMemberName(client.assigned_to)}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem responsável atribuído</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Propostas Recentes */}
                  {proposals.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Propostas Recentes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {proposals.slice(0, 3).map((proposal) => (
                          <div key={proposal.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                            <div>
                              <p className="font-medium">#{proposal.id.slice(0, 8)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(proposal.created_at || '')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-success">{formatCurrency(proposal.total_value)}</p>
                              <Badge variant="outline" className="text-xs">{proposal.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Vendas Recentes */}
                  {sales.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Vendas Recentes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sales.slice(0, 3).map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                            <div>
                              <p className="font-medium">#{sale.id.slice(0, 8)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(sale.created_at || '')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-success">{formatCurrency(sale.total_value)}</p>
                              <Badge variant="outline" className="text-xs">{sale.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Communication Modal */}
        <AddCommunicationModal
          open={showAddCommunication}
          onOpenChange={setShowAddCommunication}
          clientId={client.id}
          clientName={client.name}
          defaultType={defaultCommType}
          defaultDirection={defaultCommDirection}
        />
      </DialogContent>
    </Dialog>
  );
}
