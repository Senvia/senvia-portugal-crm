import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  MessageCircle, 
  Pencil,
  FileText,
  Euro,
  ShoppingBag,
  ExternalLink
} from "lucide-react";
import { CrmClient, CLIENT_STATUS_LABELS, CLIENT_STATUS_STYLES, CLIENT_SOURCE_LABELS } from "@/types/clients";
import { formatDate, formatDateTime, getWhatsAppUrl, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ClientDetailsModalProps {
  client: CrmClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: CrmClient) => void;
}

export function ClientDetailsModal({ client, open, onOpenChange, onEdit }: ClientDetailsModalProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{client.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Cliente desde {formatDate(client.created_at)}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border",
                CLIENT_STATUS_STYLES[client.status].bg,
                CLIENT_STATUS_STYLES[client.status].text,
                CLIENT_STATUS_STYLES[client.status].border
              )}
            >
              {CLIENT_STATUS_LABELS[client.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Informações de Contacto</h4>
            
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
                <a
                  href={getWhatsAppUrl(client.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto"
                >
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                  </Button>
                </a>
              </div>
            )}
            
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                  {client.email}
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Criado: {formatDateTime(client.created_at)}</span>
            </div>
          </div>

          {/* Company Info */}
          {(client.company || client.nif) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Dados da Empresa</h4>
                
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
            </>
          )}

          {/* Metrics */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Métricas</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <FileText className="h-3 w-3" />
                </div>
                <p className="text-lg font-semibold">{client.total_proposals}</p>
                <p className="text-xs text-muted-foreground">Propostas</p>
              </div>
              
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ShoppingBag className="h-3 w-3" />
                </div>
                <p className="text-lg font-semibold">{client.total_sales}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
              
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Euro className="h-3 w-3" />
                </div>
                <p className="text-lg font-semibold">{formatCurrency(client.total_value)}</p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </div>

          {/* Source */}
          {client.source && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  Origem
                </h4>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {CLIENT_SOURCE_LABELS[client.source] || client.source}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {client.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Notas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => { onOpenChange(false); onEdit(client); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
