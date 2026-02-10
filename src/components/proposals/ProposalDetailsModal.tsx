import { useState, useEffect } from 'react';
import { Trash2, Printer, Mail, Loader2, Router, Zap, Wrench, Pencil, MoreHorizontal, CalendarDays, TrendingUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSendProposalEmail } from '@/hooks/useSendProposalEmail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProposal, useDeleteProposal, useProposalProducts } from '@/hooks/useProposals';
import { useProposalCpes } from '@/hooks/useProposalCpes';
import { useUpdateLeadStatus, useUpdateLead } from '@/hooks/useLeads';
import { useFinalStages } from '@/hooks/usePipelineStages';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUS_COLORS, 
  PROPOSAL_STATUSES, 
  PROPOSAL_TYPE_LABELS, 
  MODELO_SERVICO_LABELS,
  NEGOTIATION_TYPE_LABELS,
  type NegotiationType 
} from '@/types/proposals';
import type { Proposal, ProposalStatus, ProposalType } from '@/types/proposals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateSaleModal } from "@/components/sales/CreateSaleModal";
import { EditProposalModal } from "@/components/proposals/EditProposalModal";

interface ProposalDetailsModalProps {
  proposal: Proposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalDetailsModal({ proposal, open, onOpenChange }: ProposalDetailsModalProps) {
  const { data: proposalProducts = [] } = useProposalProducts(proposal?.id);
  const { data: proposalCpes = [] } = useProposalCpes(proposal?.id);
  const { data: orgData } = useOrganization();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const updateLeadStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const { finalPositiveStage, finalNegativeStage } = useFinalStages();
  const sendProposalEmail = useSendProposalEmail();
  
  // Obter logo e nome da organização
  const logoUrl = (orgData?.form_settings as any)?.logo_url || null;
  const orgName = orgData?.name || '';
  
  const [status, setStatus] = useState<ProposalStatus>('draft');
  const [notes, setNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editValue, setEditValue] = useState<string>('0');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Sincronizar estado quando proposal muda
  useEffect(() => {
    if (proposal) {
      setEditValue(proposal.total_value.toString());
      setStatus(proposal.status);
      setNotes(proposal.notes || '');
    }
  }, [proposal]);

  // Early return if no proposal
  if (!proposal) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleStatusChange = (newStatus: ProposalStatus) => {
    // Quando seleciona "accepted", abre modal de venda (não muda status ainda)
    if (newStatus === 'accepted') {
      setShowSaleModal(true);
      return;
    }
    
    setStatus(newStatus);
    updateProposal.mutate({ id: proposal.id, status: newStatus });
    
    // When proposal is rejected, move lead to final negative stage
    if (newStatus === 'rejected') {
      if (proposal.lead_id && finalNegativeStage) {
        updateLeadStatus.mutate({ leadId: proposal.lead_id, status: finalNegativeStage.key });
      }
    }
  };

  // Callback quando venda é criada com sucesso
  const handleSaleCreated = () => {
    // Só aqui é que a proposta passa a "accepted"
    updateProposal.mutate({ id: proposal.id, status: 'accepted' });
    setStatus('accepted');
    
    // Atualizar lead para estágio final positivo
    if (proposal.lead_id && finalPositiveStage) {
      updateLeadStatus.mutate({ leadId: proposal.lead_id, status: finalPositiveStage.key });
      updateLead.mutate({ leadId: proposal.lead_id, updates: { value: proposal.total_value } });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== proposal.notes) {
      updateProposal.mutate({ id: proposal.id, notes: notes.trim() || undefined });
    }
  };

  const handleValueBlur = () => {
    const newValue = parseFloat(editValue) || 0;
    if (newValue !== proposal.total_value) {
      updateProposal.mutate({ id: proposal.id, total_value: newValue });
    }
  };

  const handlePrint = () => {
    // Dados do cliente
    const client = proposal.client;
    const clientName = client?.name || '';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    
    // Tentar obter dados adicionais do cliente (company, nif, address)
    const clientCompany = (client as any)?.company || '';
    const clientNif = (client as any)?.nif || '';
    const clientAddress = (client as any)?.address_line1 || '';
    const clientCity = (client as any)?.city || '';
    const clientPostalCode = (client as any)?.postal_code || '';
    
    const fullAddress = [clientAddress, clientPostalCode, clientCity].filter(Boolean).join(', ');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Proposta ${proposal.code || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; 
              padding: 40px; 
              color: #1a1a1a; 
              max-width: 800px; 
              margin: 0 auto; 
              line-height: 1.6;
              background: white;
            }
            
            /* CABEÇALHO */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              border-bottom: 3px solid #3B82F6;
              padding-bottom: 25px;
              margin-bottom: 30px;
            }
            .header-left { 
              display: flex; 
              flex-direction: column; 
              gap: 8px; 
            }
            .header-left img { 
              max-height: 60px; 
              max-width: 180px; 
              object-fit: contain; 
            }
            .header-left .org-name { 
              font-size: 14px; 
              color: #64748b; 
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header-right { 
              text-align: right; 
            }
            .header-right h1 { 
              font-size: 22px; 
              color: #3B82F6; 
              font-weight: 700;
              margin-bottom: 4px;
            }
            .header-right .date { 
              color: #64748b; 
              font-size: 14px; 
            }
            
            /* DADOS DO CLIENTE */
            .client-box { 
              background: #f8fafc; 
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 25px;
            }
            .client-box h3 { 
              margin: 0 0 12px; 
              font-size: 11px; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
            }
            .client-box .client-name {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 8px;
            }
            .client-box .client-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 20px;
            }
            .client-box .client-detail {
              font-size: 13px;
              color: #475569;
            }
            .client-box .client-detail strong {
              color: #64748b;
              font-weight: 500;
            }
            
            /* VALOR TOTAL */
            .total-box { 
              background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
              color: white;
              padding: 28px;
              border-radius: 12px;
              text-align: center;
              margin: 25px 0;
              box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
            }
            .total-box .label { 
              font-size: 11px; 
              opacity: 0.9; 
              letter-spacing: 2px;
              text-transform: uppercase;
              font-weight: 500;
            }
            .total-box .value { 
              font-size: 42px; 
              font-weight: 700; 
              margin-top: 8px;
              letter-spacing: -1px;
            }
            
            /* CPE TABLE */
            .cpes { margin: 30px 0; }
            .cpes h3 { 
              font-size: 11px; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .cpe-card {
              background: #fffbeb;
              border: 1px solid #fcd34d;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 12px;
            }
            .cpe-header {
              font-weight: 600;
              margin-bottom: 8px;
              color: #92400e;
            }
            .cpe-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
              font-size: 13px;
            }
            .cpe-field {
              color: #78350f;
            }
            .cpe-field strong {
              color: #92400e;
            }
            
            /* OBSERVAÇÕES */
            .notes-section { 
              background: #fefce8; 
              border-left: 4px solid #eab308;
              padding: 16px 20px;
              border-radius: 0 10px 10px 0;
              margin: 25px 0;
            }
            .notes-section h4 { 
              font-size: 11px; 
              color: #a16207; 
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .notes-section p { 
              font-size: 14px; 
              color: #713f12;
              white-space: pre-wrap;
              line-height: 1.5;
            }
            
            /* RODAPÉ */
            .footer { 
              margin-top: 50px; 
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 11px;
            }
            .footer p { margin: 4px 0; }
            .footer .validity {
              color: #64748b;
              font-weight: 500;
            }
            
            @media print { 
              body { padding: 20px; }
              .total-box { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <!-- CABEÇALHO -->
          <div class="header">
            <div class="header-left">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
              ${orgName ? `<span class="org-name">${orgName}</span>` : ''}
            </div>
            <div class="header-right">
              <h1>PROPOSTA ${proposal.code || ''}</h1>
              <div class="date">${format(new Date(proposal.proposal_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}</div>
            </div>
          </div>
          
          <!-- DADOS DO CLIENTE -->
          ${clientName ? `
          <div class="client-box">
            <h3>Cliente</h3>
            <div class="client-name">${clientName}</div>
            <div class="client-details">
              ${clientCompany ? `<div class="client-detail"><strong>Empresa:</strong> ${clientCompany}</div>` : ''}
              ${clientNif ? `<div class="client-detail"><strong>NIF:</strong> ${clientNif}</div>` : ''}
              ${clientEmail ? `<div class="client-detail"><strong>Email:</strong> ${clientEmail}</div>` : ''}
              ${clientPhone ? `<div class="client-detail"><strong>Telefone:</strong> ${clientPhone}</div>` : ''}
              ${fullAddress ? `<div class="client-detail" style="grid-column: span 2;"><strong>Morada:</strong> ${fullAddress}</div>` : ''}
            </div>
          </div>
          ` : ''}
          
          <!-- VALOR TOTAL -->
          <div class="total-box">
            <div class="label">${orgData?.niche === 'telecom' ? 'Consumo Total MWh' : 'Valor Total'}</div>
            <div class="value">${orgData?.niche === 'telecom' 
              ? `${(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.consumo_anual) || 0), 0) / 1000).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} MWh`
              : formatCurrency(parseFloat(editValue) || proposal.total_value)}</div>
            ${orgData?.niche === 'telecom' && proposal.proposal_type === 'energia' && proposalCpes.length > 0 ? `
              <div style="font-size: 12px; color: #666; margin-top: 6px;">
                Margem Total: <strong>${formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.margem) || 0), 0))}</strong>
                &nbsp;|&nbsp;
                Comissão Total: <strong>${formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.comissao) || 0), 0))}</strong>
              </div>
            ` : ''}
            ${orgData?.niche === 'telecom' && proposal.proposal_type === 'servicos' ? `
              <div style="font-size: 12px; color: #666; margin-top: 6px;">
                ${proposal.kwp != null ? `kWp: <strong>${Number(proposal.kwp).toLocaleString('pt-PT')}</strong>` : ''}
                ${proposal.kwp != null && proposal.comissao != null ? '&nbsp;|&nbsp;' : ''}
                ${proposal.comissao != null ? `Comissão: <strong>${formatCurrency(Number(proposal.comissao))}</strong>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- CPEs com dados de energia -->
          ${proposalCpes.length > 0 ? `
            <div class="cpes">
              <h3>CPEs / Pontos de Consumo</h3>
              ${proposalCpes.map(cpe => `
                <div class="cpe-card">
                  <div class="cpe-header">${cpe.equipment_type} ${cpe.serial_number ? `- ${cpe.serial_number}` : ''}</div>
                  <div class="cpe-grid">
                    <div class="cpe-field"><strong>Comercializador:</strong> ${cpe.comercializador}</div>
                    ${cpe.consumo_anual ? `<div class="cpe-field"><strong>Consumo:</strong> ${Number(cpe.consumo_anual).toLocaleString('pt-PT')} kWh</div>` : ''}
                    ${cpe.duracao_contrato ? `<div class="cpe-field"><strong>Duração:</strong> ${cpe.duracao_contrato} anos</div>` : ''}
                    ${cpe.dbl ? `<div class="cpe-field"><strong>DBL:</strong> ${cpe.dbl} €/MWh</div>` : ''}
                    ${cpe.margem ? `<div class="cpe-field"><strong>Margem:</strong> ${formatCurrency(Number(cpe.margem))}</div>` : ''}
                    ${cpe.comissao ? `<div class="cpe-field"><strong>Comissão:</strong> ${formatCurrency(Number(cpe.comissao))}</div>` : ''}
                    ${cpe.contrato_inicio ? `<div class="cpe-field"><strong>Início:</strong> ${cpe.contrato_inicio}</div>` : ''}
                    ${cpe.contrato_fim ? `<div class="cpe-field"><strong>Fim:</strong> ${cpe.contrato_fim}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- OBSERVAÇÕES -->
          ${notes ? `
            <div class="notes-section">
              <h4>Observações</h4>
              <p>${notes}</p>
            </div>
          ` : ''}

          <!-- RODAPÉ -->
          <div class="footer">
            <p class="validity">Proposta válida por 30 dias a partir da data de emissão</p>
            <p>Documento gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = () => {
    deleteProposal.mutate(proposal.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const { organization } = useAuth();

  const handleSendEmail = () => {
    if (!proposal.client?.email || !organization?.id) return;
    
    sendProposalEmail.mutate({
      organizationId: organization.id,
      to: proposal.client.email,
      clientName: proposal.client.name || 'Cliente',
      proposalCode: proposal.code || '',
      proposalDate: format(new Date(proposal.proposal_date), "d 'de' MMMM 'de' yyyy", { locale: pt }),
      totalValue: parseFloat(editValue) || proposal.total_value,
      products: proposalProducts.map(item => ({
        name: item.product?.name || 'Produto',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      notes: notes || undefined,
      orgName: orgName,
      logoUrl: logoUrl || undefined,
    });
  };

  const isBrevoConfigured = !!(orgData?.brevo_api_key && orgData?.brevo_sender_email);
  const canSendEmail = proposal.client?.email && isBrevoConfigured && !sendProposalEmail.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen && showSaleModal) return;
        onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-10">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle>
                Proposta {proposal.code || ''}
              </DialogTitle>
              <Badge className={cn(PROPOSAL_STATUS_COLORS[status])}>
                {PROPOSAL_STATUS_LABELS[status]}
              </Badge>
              {orgData?.niche === 'telecom' && proposal.negotiation_type && (
                <Badge variant="outline" className="text-xs">
                  {NEGOTIATION_TYPE_LABELS[proposal.negotiation_type as NegotiationType]}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex-1 min-w-0">
                {orgData?.niche === 'telecom' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">Consumo Total MWh</p>
                    <p className="text-2xl font-bold text-primary">
                      {(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.consumo_anual) || 0), 0) / 1000).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} MWh
                    </p>
                    {proposal.proposal_type === 'energia' && proposalCpes.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span>Margem Total: <strong className="text-foreground">{formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.margem) || 0), 0))}</strong></span>
                        <span>Comissão Total: <strong className="text-foreground">{formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.comissao) || 0), 0))}</strong></span>
                      </div>
                    )}
                    {proposal.proposal_type === 'servicos' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {proposal.kwp != null && <span>kWp: <strong className="text-foreground">{Number(proposal.kwp).toLocaleString('pt-PT')}</strong></span>}
                        {proposal.comissao != null && <span>Comissão: <strong className="text-foreground">{formatCurrency(Number(proposal.comissao))}</strong></span>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleValueBlur}
                        className="text-2xl font-bold text-primary border-none p-0 h-auto bg-transparent focus-visible:ring-1 focus-visible:ring-primary/50 max-w-[180px]"
                      />
                      <span className="text-lg text-primary font-medium">€</span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(proposal.proposal_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              </div>
            </div>

            {/* Dados do Cliente */}
            {proposal.client && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">Cliente</p>
                <div className="space-y-1">
                  <p className="font-medium text-base">{proposal.client.name}</p>
                  {proposal.client.email && (
                    <p className="text-sm text-muted-foreground">{proposal.client.email}</p>
                  )}
                  {proposal.client.phone && (
                    <p className="text-sm text-muted-foreground">{proposal.client.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Fallback para Lead (retrocompatibilidade) */}
            {!proposal.client && proposal.lead && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">Lead</p>
                <div className="space-y-1">
                  <p className="font-medium text-base">{proposal.lead.name}</p>
                  {proposal.lead.email && (
                    <p className="text-sm text-muted-foreground">{proposal.lead.email}</p>
                  )}
                  {proposal.lead.phone && (
                    <p className="text-sm text-muted-foreground">{proposal.lead.phone}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status da Proposta</Label>
              <Select 
                value={status} 
                onValueChange={(v) => handleStatusChange(v as ProposalStatus)}
                disabled={status === 'accepted'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  {PROPOSAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROPOSAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Proposta Badge - Apenas Telecom */}
            {orgData?.niche === 'telecom' && proposal.proposal_type && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "flex items-center gap-1.5",
                  proposal.proposal_type === 'energia' 
                    ? "border-amber-500/50 text-amber-600 dark:text-amber-400" 
                    : "border-blue-500/50 text-blue-600 dark:text-blue-400"
                )}>
                  {proposal.proposal_type === 'energia' ? <Zap className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                  {PROPOSAL_TYPE_LABELS[proposal.proposal_type as ProposalType] || proposal.proposal_type}
                </Badge>
              </div>
            )}

            {/* CPEs com Dados de Energia por CPE - Apenas Telecom */}
            {orgData?.niche === 'telecom' && proposalCpes.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Router className="h-4 w-4" />
                  CPEs / Pontos de Consumo
                </Label>
                <div className="space-y-3">
                  {proposalCpes.map((cpe) => (
                    <div
                      key={cpe.id}
                      className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium text-sm">{cpe.equipment_type}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Comercializador:</span>
                          <p className="font-medium">{cpe.comercializador}</p>
                        </div>
                        {cpe.serial_number && (
                          <div>
                            <span className="text-muted-foreground text-xs">CPE/CUI:</span>
                            <p className="font-medium font-mono text-xs">{cpe.serial_number}</p>
                          </div>
                        )}
                        
                        {/* Dados de Energia */}
                        {cpe.consumo_anual && (
                          <div>
                            <span className="text-muted-foreground text-xs">Consumo Anual:</span>
                            <p className="font-medium">{Number(cpe.consumo_anual).toLocaleString('pt-PT')} kWh</p>
                          </div>
                        )}
                        {cpe.duracao_contrato && (
                          <div>
                            <span className="text-muted-foreground text-xs">Duração:</span>
                            <p className="font-medium">{cpe.duracao_contrato} {cpe.duracao_contrato === 1 ? 'ano' : 'anos'}</p>
                          </div>
                        )}
                        {cpe.dbl && (
                          <div>
                            <span className="text-muted-foreground text-xs">DBL:</span>
                            <p className="font-medium">{cpe.dbl} €/MWh</p>
                          </div>
                        )}
                        {cpe.margem && (
                          <div>
                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> Margem:
                            </span>
                            <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(Number(cpe.margem))}</p>
                          </div>
                        )}
                        {cpe.comissao && (
                          <div>
                            <span className="text-muted-foreground text-xs">Comissão:</span>
                            <p className="font-medium text-primary">{formatCurrency(Number(cpe.comissao))}</p>
                          </div>
                        )}
                        
                        {/* Datas de Contrato */}
                        {(cpe.contrato_inicio || cpe.contrato_fim) && (
                          <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-amber-200 dark:border-amber-700 mt-1">
                            <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            {cpe.contrato_inicio && (
                              <div>
                                <span className="text-muted-foreground text-xs">Início:</span>
                                <p className="font-medium text-xs">{cpe.contrato_inicio}</p>
                              </div>
                            )}
                            {cpe.contrato_fim && (
                              <div>
                                <span className="text-muted-foreground text-xs">Fim:</span>
                                <p className="font-medium text-xs">{cpe.contrato_fim}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campos específicos de Serviços - Apenas Telecom */}
            {orgData?.niche === 'telecom' && proposal.proposal_type === 'servicos' && (
              <div className="space-y-3 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Wrench className="h-4 w-4" />
                  <span className="font-medium text-sm">Dados do Serviço</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {proposal.servicos_produtos && proposal.servicos_produtos.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Produtos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {proposal.servicos_produtos.map((prod) => (
                          <Badge key={prod} variant="secondary" className="text-xs">
                            {prod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {proposal.modelo_servico && (
                    <div>
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="ml-2 font-medium">{MODELO_SERVICO_LABELS[proposal.modelo_servico as keyof typeof MODELO_SERVICO_LABELS] || proposal.modelo_servico}</span>
                    </div>
                  )}
                  {proposal.kwp && (
                    <div>
                      <span className="text-muted-foreground">Potência:</span>
                      <span className="ml-2 font-medium">{proposal.kwp} kWp</span>
                    </div>
                  )}
                  {proposal.comissao && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Comissão:</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">{formatCurrency(proposal.comissao)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {proposalProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Produtos/Serviços</Label>
                <div className="space-y-2">
                  {proposalProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.product?.name || 'Produto'}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="proposal-notes">Observações da Negociação</Label>
              <Textarea
                id="proposal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notas internas sobre a negociação..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Eliminar</span>
            </Button>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem 
                    onClick={() => setShowEditModal(true)}
                    disabled={status === 'accepted'}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSendEmail}
                    disabled={!canSendEmail}
                  >
                    {sendProposalEmail.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    {!isBrevoConfigured ? 'Configurar Email' : 'Enviar Email'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar esta proposta? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateSaleModal
        open={showSaleModal}
        onOpenChange={setShowSaleModal}
        prefillProposal={proposal}
        prefillClientId={proposal.client_id}
        onSaleCreated={handleSaleCreated}
      />

      <EditProposalModal
        proposal={proposal}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={() => {
          // Fechar modal de detalhes para forçar refetch
          onOpenChange(false);
        }}
      />
    </>
  );
}
