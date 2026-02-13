import { Mail, Eye, AlertCircle, MoreHorizontal, Trash2, BarChart3 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmailCampaign } from "@/types/marketing";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_STYLES } from "@/types/marketing";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface CampaignsTableProps {
  campaigns: EmailCampaign[];
  onView: (campaign: EmailCampaign) => void;
  onDelete: (id: string) => void;
}

export function CampaignsTable({ campaigns, onView, onDelete }: CampaignsTableProps) {
  const isMobile = useIsMobile();

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Sem campanhas</p>
        <p className="text-sm">Crie a sua primeira campanha de email</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {campaigns.map(campaign => {
          const style = CAMPAIGN_STATUS_STYLES[campaign.status];
          return (
            <div
              key={campaign.id}
              className="p-4 border rounded-lg space-y-2 cursor-pointer hover:bg-muted/30"
              onClick={() => onView(campaign)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">{campaign.template?.name || '—'}</p>
                </div>
                <Badge className="text-xs shrink-0 ml-2" style={{ backgroundColor: style.bg, color: style.text }}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {campaign.total_recipients}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {campaign.sent_count}</span>
                {campaign.failed_count > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {campaign.failed_count}</span>
                )}
                <span className="ml-auto">{format(new Date(campaign.created_at), "dd/MM/yyyy")}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="text-center">Destinatários</TableHead>
            <TableHead className="text-center">Enviados</TableHead>
            <TableHead className="text-center">Erros</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map(campaign => {
            const style = CAMPAIGN_STATUS_STYLES[campaign.status];
            return (
              <TableRow key={campaign.id} className="cursor-pointer" onClick={() => onView(campaign)}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="text-muted-foreground">{campaign.template?.name || '—'}</TableCell>
                <TableCell className="text-center">{campaign.total_recipients}</TableCell>
                <TableCell className="text-center">{campaign.sent_count}</TableCell>
                <TableCell className="text-center">{campaign.failed_count > 0 ? <span className="text-destructive">{campaign.failed_count}</span> : '0'}</TableCell>
                <TableCell>
                  <Badge className="text-xs" style={{ backgroundColor: style.bg, color: style.text }}>
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(campaign.created_at), "dd/MM/yyyy")}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(campaign)}>
                        <BarChart3 className="mr-2 h-4 w-4" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(campaign.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
