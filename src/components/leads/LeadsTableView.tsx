import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { MessageCircle, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Lead, LeadTemperature, TEMPERATURE_STYLES } from '@/types';
import { formatCurrency, formatPhoneForWhatsApp } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePipelineStages, PipelineStage } from '@/hooks/usePipelineStages';
import { useLeadProposalValues } from '@/hooks/useLeadProposalValues';
import { Skeleton } from '@/components/ui/skeleton';

interface LeadsTableViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: string) => void;
  onTemperatureChange: (leadId: string, temperature: LeadTemperature) => void;
  onViewDetails: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

type SortField = 'name' | 'email' | 'status' | 'temperature' | 'value' | 'source' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Helper to generate badge style from hex color
const getStatusBadgeStyle = (hexColor: string) => ({
  backgroundColor: `${hexColor}20`,
  color: hexColor,
  borderColor: `${hexColor}30`,
});

export function LeadsTableView({
  leads,
  onStatusChange,
  onTemperatureChange,
  onViewDetails,
  onDelete,
}: LeadsTableViewProps) {
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages();
  const { data: proposalValues } = useLeadProposalValues();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
      case 'temperature':
        comparison = (a.temperature || '').localeCompare(b.temperature || '');
        break;
      case 'value':
        comparison = (a.value || 0) - (b.value || 0);
        break;
      case 'source':
        comparison = (a.source || '').localeCompare(b.source || '');
        break;
      case 'created_at':
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleWhatsAppClick = (phone: string, name: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const message = encodeURIComponent(`Olá ${name}! `);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  // Find stage by key for dynamic labels and colors
  const getStageByKey = (key: string): PipelineStage | undefined => {
    return stages.find(s => s.key === key);
  };

  const getStatusLabel = (statusKey: string): string => {
    const stage = getStageByKey(statusKey);
    return stage?.name || statusKey || 'Desconhecido';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </Button>
  );

  if (stagesLoading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden p-4">
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-16 w-full mb-2" />
        <Skeleton className="h-16 w-full mb-2" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">
                <SortableHeader field="name">Nome</SortableHeader>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortableHeader field="email">Email</SortableHeader>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>
                <SortableHeader field="status">Status</SortableHeader>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortableHeader field="temperature">Temp.</SortableHeader>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortableHeader field="value">Valor</SortableHeader>
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <SortableHeader field="source">Fonte</SortableHeader>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortableHeader field="created_at">Criado</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sortedLeads.map((lead) => {
                const currentStage = getStageByKey(lead.status || '');
                return (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetails(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(lead.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[120px]">{lead.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground truncate max-w-[180px] block">
                        {lead.email}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => handleWhatsAppClick(lead.phone, lead.name)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline truncate max-w-[100px]">{lead.phone}</span>
                      </Button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={lead.status || ''}
                        onValueChange={(value) => onStatusChange(lead.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent p-0">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={currentStage ? getStatusBadgeStyle(currentStage.color) : undefined}
                          >
                            {getStatusLabel(lead.status || '')}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.key}>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={getStatusBadgeStyle(stage.color)}
                              >
                                {stage.name}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={lead.temperature || 'warm'}
                        onValueChange={(value) => onTemperatureChange(lead.id, value as LeadTemperature)}
                      >
                        <SelectTrigger className="w-[90px] h-8 border-0 bg-transparent p-0">
                          <span className="text-lg">
                            {TEMPERATURE_STYLES[lead.temperature as LeadTemperature || 'warm'].emoji}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {(['cold', 'warm', 'hot'] as LeadTemperature[]).map((temp) => (
                            <SelectItem key={temp} value={temp}>
                              <div className="flex items-center gap-2">
                                <span>{TEMPERATURE_STYLES[temp].emoji}</span>
                                <span className="capitalize">{temp}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {(() => {
                        const pValue = proposalValues?.get(lead.id);
                        const displayValue = pValue || lead.value;
                        if (!displayValue) return <span className="text-muted-foreground">-</span>;
                        return (
                          <span className="font-medium text-primary">
                            {formatCurrency(displayValue)}
                            {pValue && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">(propostas)</span>
                            )}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-muted-foreground text-sm">
                        {lead.source || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-muted-foreground text-sm">
                        {lead.created_at 
                          ? format(new Date(lead.created_at), 'dd MMM yyyy', { locale: pt })
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewDetails(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Lead</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tens a certeza que queres eliminar {lead.name}? Esta ação não pode ser revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(lead.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
