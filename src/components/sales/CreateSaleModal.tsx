import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeads } from "@/hooks/useLeads";
import { useProposals } from "@/hooks/useProposals";
import { useCreateSale } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/format";
import { Loader2 } from "lucide-react";

interface CreateSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSaleModal({ open, onOpenChange }: CreateSaleModalProps) {
  const { data: leads } = useLeads();
  const { data: proposals } = useProposals();
  const createSale = useCreateSale();

  const [leadId, setLeadId] = useState<string>("");
  const [proposalId, setProposalId] = useState<string>("");
  const [totalValue, setTotalValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setLeadId("");
      setProposalId("");
      setTotalValue("");
      setNotes("");
    }
  }, [open]);

  // Filter proposals based on selected lead
  const filteredProposals = proposals?.filter((p) => {
    // Only show accepted or sent proposals that don't already have a sale
    if (leadId) {
      return p.lead_id === leadId;
    }
    return true;
  }) || [];

  // Auto-fill when proposal is selected
  const handleProposalSelect = (value: string) => {
    if (value === "none") {
      setProposalId("");
      return;
    }
    
    setProposalId(value);
    const proposal = proposals?.find((p) => p.id === value);
    if (proposal) {
      setTotalValue(proposal.total_value.toString());
      if (proposal.lead_id && !leadId) {
        setLeadId(proposal.lead_id);
      }
    }
  };

  const handleLeadSelect = (value: string) => {
    if (value === "none") {
      setLeadId("");
      // Clear proposal if it doesn't belong to the new lead
      if (proposalId) {
        const proposal = proposals?.find((p) => p.id === proposalId);
        if (proposal && proposal.lead_id !== "") {
          setProposalId("");
        }
      }
      return;
    }
    
    setLeadId(value);
    // Clear proposal if it doesn't belong to the new lead
    if (proposalId) {
      const proposal = proposals?.find((p) => p.id === proposalId);
      if (proposal && proposal.lead_id !== value) {
        setProposalId("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseFloat(totalValue);
    if (isNaN(value) || value <= 0) return;

    await createSale.mutateAsync({
      lead_id: leadId || null,
      proposal_id: proposalId || null,
      total_value: value,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  const isValid = parseFloat(totalValue) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Venda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Lead Select (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="lead">Lead (opcional)</Label>
            <Select value={leadId || "none"} onValueChange={handleLeadSelect}>
              <SelectTrigger id="lead" className="w-full">
                <SelectValue placeholder="Selecionar lead..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Venda sem lead</SelectItem>
                {leads?.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proposal Select (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="proposal">Proposta (opcional)</Label>
            <Select value={proposalId || "none"} onValueChange={handleProposalSelect}>
              <SelectTrigger id="proposal" className="w-full">
                <SelectValue placeholder="Selecionar proposta..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Venda direta</SelectItem>
                {filteredProposals.map((proposal) => (
                  <SelectItem key={proposal.id} value={proposal.id}>
                    {proposal.lead?.name || "Lead"} - {formatCurrency(proposal.total_value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredProposals.length === 0 && leadId && (
              <p className="text-xs text-muted-foreground">
                Nenhuma proposta encontrada para este lead.
              </p>
            )}
          </div>

          {/* Total Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor Total *</Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                className="pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicionar notas sobre a venda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createSale.isPending}
            >
              {createSale.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                "Criar Venda"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
