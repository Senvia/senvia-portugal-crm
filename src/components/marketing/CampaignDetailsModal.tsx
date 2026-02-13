import { useState, useMemo } from "react";
import { Mail, CheckCircle2, AlertCircle, Eye, MousePointer, Search, ArrowLeft } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useCampaignSends } from "@/hooks/useCampaigns";
import type { EmailCampaign } from "@/types/marketing";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_STYLES } from "@/types/marketing";
import { format } from "date-fns";
import { normalizeString } from "@/lib/utils";

interface CampaignDetailsModalProps {
  campaign: EmailCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsModal({ campaign, open, onOpenChange }: CampaignDetailsModalProps) {
  const { data: sends = [] } = useCampaignSends(campaign?.id || null);
  const [recipientSearch, setRecipientSearch] = useState("");

  const opened = sends.filter(s => s.opened_at).length;
  const clicked = sends.filter(s => s.clicked_at).length;
  const failed = sends.filter(s => s.status === 'failed' || s.status === 'bounced').length;
  const delivered = sends.filter(s => s.status === 'sent' || s.status === 'delivered').length;

  const totalRecipients = campaign?.total_recipients ?? 0;
  const progress = totalRecipients > 0 ? Math.round((((campaign?.sent_count ?? 0) + (campaign?.failed_count ?? 0)) / totalRecipients) * 100) : 0;
  const style = campaign ? CAMPAIGN_STATUS_STYLES[campaign.status] : CAMPAIGN_STATUS_STYLES['draft'];

  const openPct = totalRecipients > 0 ? Math.round((opened / totalRecipients) * 100) : 0;
  const clickPct = totalRecipients > 0 ? Math.round((clicked / totalRecipients) * 100) : 0;

  const filteredSends = useMemo(() => {
    if (!recipientSearch) return sends;
    const q = normalizeString(recipientSearch);
    return sends.filter(s =>
      normalizeString(s.recipient_name || '').includes(q) ||
      normalizeString(s.recipient_email).includes(q)
    );
  }, [sends, recipientSearch]);

  if (!campaign) return null;

  const metrics = [
    { label: "Destinatários", value: campaign.total_recipients, icon: Mail, color: "text-foreground" },
    { label: "Enviados", value: delivered, icon: CheckCircle2, color: "text-green-500" },
    { label: "Aberturas", value: opened, pct: openPct, icon: Eye, color: "text-blue-500" },
    { label: "Cliques", value: clicked, pct: clickPct, icon: MousePointer, color: "text-purple-500" },
    { label: "Erros", value: failed, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">{campaign.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-xs" style={{ backgroundColor: style.bg, color: style.text }}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </Badge>
                {campaign.sent_at && (
                  <span className="text-xs text-muted-foreground">
                    Enviada a {format(new Date(campaign.sent_at), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {metrics.map(m => (
                <div key={m.label} className="text-center p-4 bg-muted/50 rounded-lg border">
                  <m.icon className={`h-5 w-5 mx-auto mb-2 ${m.color}`} />
                  <p className="text-2xl font-bold">
                    {m.value}
                    {m.pct !== undefined && <span className="text-xs font-normal text-muted-foreground ml-1">({m.pct}%)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            {campaign.status === 'sending' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-2 text-sm">
              {campaign.template && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">{campaign.template.name}</span>
                </div>
              )}
              {campaign.template && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assunto:</span>
                  <span className="font-medium">{campaign.template.subject}</span>
                </div>
              )}
              {campaign.sent_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviada em:</span>
                  <span>{format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
              )}
            </div>

            {/* Recipients List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Destinatários ({sends.length})</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar destinatário..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border rounded-lg divide-y">
                {filteredSends.map(send => (
                  <div key={send.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{send.recipient_name || send.recipient_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{send.recipient_email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {send.opened_at && <Eye className="h-3.5 w-3.5 text-blue-500" />}
                      {send.clicked_at && <MousePointer className="h-3.5 w-3.5 text-purple-500" />}
                      {(send.status === 'failed' || send.status === 'bounced') ? (
                        <Badge variant="destructive" className="text-xs">Erro</Badge>
                      ) : send.status === 'delivered' ? (
                        <Badge variant="secondary" className="text-xs">Entregue</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Enviado</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {filteredSends.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground text-sm">
                    {recipientSearch ? 'Nenhum destinatário encontrado' : 'Sem dados de envio'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
