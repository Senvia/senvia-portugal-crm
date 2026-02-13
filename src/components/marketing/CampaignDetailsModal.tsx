import { Mail, CheckCircle2, AlertCircle, Eye, MousePointer, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useCampaignSends } from "@/hooks/useCampaigns";
import type { EmailCampaign } from "@/types/marketing";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_STYLES } from "@/types/marketing";
import { format } from "date-fns";

interface CampaignDetailsModalProps {
  campaign: EmailCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsModal({ campaign, open, onOpenChange }: CampaignDetailsModalProps) {
  const { data: sends = [] } = useCampaignSends(campaign?.id || null);

  if (!campaign) return null;

  const opened = sends.filter(s => s.opened_at).length;
  const clicked = sends.filter(s => s.clicked_at).length;
  const failed = sends.filter(s => s.status === 'failed' || s.status === 'bounced').length;
  const delivered = sends.filter(s => s.status === 'sent' || s.status === 'delivered').length;
  const progress = campaign.total_recipients > 0 ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100) : 0;
  const style = CAMPAIGN_STATUS_STYLES[campaign.status];

  const metrics = [
    { label: "Total", value: campaign.total_recipients, icon: Mail, color: "text-foreground" },
    { label: "Enviados", value: delivered, icon: CheckCircle2, color: "text-green-500" },
    { label: "Abertos", value: opened, icon: Eye, color: "text-blue-500" },
    { label: "Clicados", value: clicked, icon: MousePointer, color: "text-purple-500" },
    { label: "Erros", value: failed, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaign.name}
            <Badge style={{ backgroundColor: style.bg, color: style.text }}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-auto flex-1">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="text-center p-3 bg-muted/50 rounded-lg">
                <m.icon className={`h-4 w-4 mx-auto mb-1 ${m.color}`} />
                <p className="text-lg font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
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
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            {campaign.template && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium">{campaign.template.name}</span>
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
          <div>
            <p className="text-sm font-medium mb-2">Destinatários ({sends.length})</p>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {sends.map(send => (
                  <div key={send.id} className="flex items-center gap-3 p-2 rounded-md text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{send.recipient_name || send.recipient_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{send.recipient_email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {send.opened_at && <Eye className="h-3.5 w-3.5 text-primary" />}
                      {send.clicked_at && <MousePointer className="h-3.5 w-3.5 text-accent-foreground" />}
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
                {sends.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground text-sm">Sem dados de envio</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
