import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
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
} from "lucide-react";
import { formatDate, formatCurrency, getWhatsAppUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientLabels } from "@/hooks/useClientLabels";
import { useClientHistory } from "@/hooks/useClientHistory";
import { useUpdateClient } from "@/hooks/useClients";
import { ClientTimeline } from "./ClientTimeline";
import type { CrmClient } from "@/types/clients";

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

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  // Sync notes when client changes
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
    active: 'Ativo',
    inactive: 'Inativo',
    vip: 'VIP',
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl px-0 pb-0 pt-safe">
        <SheetHeader className="px-4 sm:px-6 pb-0 pt-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">{client.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-xs', statusStyle.bg, statusStyle.text, statusStyle.border)}>
                    {statusLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {labels.since} {formatDate(client.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {client.phone && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${client.phone}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Ligar
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="text-success border-success/20 hover:bg-success/10" asChild>
                  <a href={getWhatsAppUrl(client.phone)} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    WhatsApp
                  </a>
                </Button>
              </>
            )}
            {client.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${client.email}`}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </a>
              </Button>
            )}
            {onNewProposal && (
              <Button variant="outline" size="sm" onClick={() => onNewProposal(client)}>
                <FileText className="h-4 w-4 mr-1" />
                Nova Proposta
              </Button>
            )}
            {onNewSale && (
              <Button variant="outline" size="sm" onClick={() => onNewSale(client)}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                Nova Venda
              </Button>
            )}
            {onScheduleMeeting && (
              <Button variant="outline" size="sm" onClick={() => onScheduleMeeting(client)}>
                <CalendarIcon className="h-4 w-4 mr-1" />
                Agendar
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="resumo" className="w-full mt-4">
          <TabsList className="w-full justify-start px-6 h-auto flex-wrap">
            <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
            <TabsTrigger value="notas" className="text-xs">Notas</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
            <TabsTrigger value="propostas" className="text-xs">
              Propostas ({proposals.length})
            </TabsTrigger>
            <TabsTrigger value="vendas" className="text-xs">
              Vendas ({sales.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-260px)]">
            {/* Resumo Tab */}
            <TabsContent value="resumo" className="p-6 pt-4 space-y-6 mt-0">
              {/* Métricas */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{client.total_proposals}</p>
                  <p className="text-xs text-muted-foreground">Propostas</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-success">{client.total_sales}</p>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(client.total_value)}</p>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                </div>
              </div>

              <Separator />

              {/* Contacto */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Contacto</h3>
                <div className="space-y-2">
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
                        className="text-success hover:underline text-xs"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Empresa */}
              {(client.company || client.nif) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Empresa</h3>
                    <div className="space-y-2">
                      {client.company && (
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{client.company}</span>
                        </div>
                      )}
                      {client.nif && (
                        <div className="flex items-center gap-3 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>NIF: {client.nif}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Morada */}
              {hasAddress && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Morada</h3>
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
                  </div>
                </>
              )}

              {/* Origem */}
              {client.source && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Origem</h3>
                    <Badge variant="secondary">{sourceLabel}</Badge>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Notas Tab */}
            <TabsContent value="notas" className="p-6 pt-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Notas</h3>
                  {!isEditingNotes ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleCancelNotes}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={updateClient.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                    </div>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Adicionar notas sobre este cliente..."
                    className="min-h-[200px]"
                    autoFocus
                  />
                ) : (
                  <div 
                    className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[200px] p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {client.notes || "Clique para adicionar notas..."}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="p-6 pt-4 mt-0">
              <ClientTimeline events={timeline} isLoading={loadingHistory} />
            </TabsContent>

            {/* Propostas Tab */}
            <TabsContent value="propostas" className="p-6 pt-4 mt-0">
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sem propostas registadas</p>
                  {onNewProposal && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => onNewProposal(client)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Proposta
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Proposta #{proposal.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(proposal.created_at || '')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">
                            {formatCurrency(proposal.total_value)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {proposal.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vendas Tab */}
            <TabsContent value="vendas" className="p-6 pt-4 mt-0">
              {sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sem vendas registadas</p>
                  {onNewSale && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => onNewSale(client)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Venda
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Venda #{sale.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(sale.created_at || '')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">
                            {formatCurrency(sale.total_value)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {sale.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
