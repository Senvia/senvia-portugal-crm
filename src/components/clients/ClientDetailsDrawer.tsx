import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  ShoppingCart,
  Calendar,
  Clock,
  Edit,
  MessageSquare,
} from "lucide-react";
import { formatDate, formatCurrency, getWhatsAppUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientLabels } from "@/hooks/useClientLabels";
import { useClientHistory } from "@/hooks/useClientHistory";
import { ClientTimeline } from "./ClientTimeline";
import type { CrmClient, CLIENT_STATUS_LABELS, CLIENT_STATUS_STYLES, CLIENT_SOURCE_LABELS } from "@/types/clients";

interface ClientDetailsDrawerProps {
  client: CrmClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: CrmClient) => void;
}

export function ClientDetailsDrawer({ client, open, onOpenChange, onEdit }: ClientDetailsDrawerProps) {
  const labels = useClientLabels();
  const { timeline, proposals, sales, events, isLoading: loadingHistory } = useClientHistory(client?.id || null);

  if (!client) return null;

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
      <SheetContent className="w-full sm:max-w-xl p-0">
        <SheetHeader className="p-6 pb-0">
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
        </SheetHeader>

        <Tabs defaultValue="resumo" className="w-full mt-4">
          <TabsList className="w-full justify-start px-6 h-auto flex-wrap">
            <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
            <TabsTrigger value="propostas" className="text-xs">
              Propostas ({proposals.length})
            </TabsTrigger>
            <TabsTrigger value="vendas" className="text-xs">
              Vendas ({sales.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)]">
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

              {/* Notas */}
              {client.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Notas</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </div>
                </>
              )}
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
