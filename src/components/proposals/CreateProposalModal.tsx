import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveProducts } from '@/hooks/useProducts';
import { useCreateProposal } from '@/hooks/useProposals';
import { useLeads } from '@/hooks/useLeads';
import type { Lead } from '@/types';

interface CreateProposalModalProps {
  lead?: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectedProduct {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export function CreateProposalModal({ lead, open, onOpenChange, onSuccess }: CreateProposalModalProps) {
  const { data: products = [] } = useActiveProducts();
  const { data: leads = [] } = useLeads();
  const createProposal = useCreateProposal();
  
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(lead?.id || null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualValue, setManualValue] = useState<string>('');
  const [additionalValue, setAdditionalValue] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');

  // Update selectedLeadId when lead prop changes
  useEffect(() => {
    if (lead?.id) {
      setSelectedLeadId(lead.id);
    }
  }, [lead?.id]);

  const productsSubtotal = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  }, [selectedProducts]);

  const totalValue = useMemo(() => {
    const manual = parseFloat(manualValue) || 0;
    const additional = parseFloat(additionalValue) || 0;
    const disc = parseFloat(discount) || 0;
    
    // Se tem valor manual, usa ele; senão, calcula pelos produtos
    const baseValue = manual > 0 ? manual : productsSubtotal;
    return Math.max(0, baseValue + additional - disc);
  }, [productsSubtotal, manualValue, additionalValue, discount]);

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find(p => p.product_id === productId);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p.product_id === productId
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.price || 0,
        },
      ]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.product_id !== productId) return p;
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      })
    );
  };

  const handlePriceChange = (productId: string, price: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product_id === productId
          ? { ...p, unit_price: price }
          : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createProposal.mutate({
      lead_id: selectedLeadId || undefined,
      total_value: totalValue,
      notes: notes.trim() || undefined,
      proposal_date: proposalDate,
      products: selectedProducts.map(p => ({
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total: p.quantity * p.unit_price,
      })),
    }, {
      onSuccess: () => {
        setSelectedLeadId(null);
        setSelectedProducts([]);
        setNotes('');
        setProposalDate(new Date().toISOString().split('T')[0]);
        setManualValue('');
        setAdditionalValue('');
        setDiscount('');
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const availableProducts = products.filter(
    p => !selectedProducts.find(sp => sp.product_id === p.id)
  );

  const hasManualValue = parseFloat(manualValue) > 0;
  const hasAdditional = parseFloat(additionalValue) > 0;
  const hasDiscount = parseFloat(discount) > 0;
  const showBreakdown = hasManualValue || selectedProducts.length > 0 || hasAdditional || hasDiscount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Selector */}
          <div className="space-y-2">
            <Label>Lead (opcional)</Label>
            <Select 
              value={selectedLeadId || 'none'} 
              onValueChange={(v) => setSelectedLeadId(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar lead..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem lead associado</SelectItem>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} {l.email && `- ${l.email}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposal-date">Data da Proposta</Label>
            <Input
              id="proposal-date"
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
            />
          </div>

          {/* Valor Manual */}
          <div className="space-y-2">
            <Label htmlFor="manual-value">Valor Manual (opcional)</Label>
            <Input
              id="manual-value"
              type="number"
              step="0.01"
              min="0"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Definir valor diretamente..."
            />
            <p className="text-xs text-muted-foreground">
              Se preenchido, substitui o total calculado pelos produtos.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Produtos/Serviços</Label>
            {availableProducts.length > 0 && (
              <Select onValueChange={handleAddProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum produto selecionado.
              </p>
            ) : (
              <div className="space-y-2 mt-2">
                {selectedProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(product.product_id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{product.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleQuantityChange(product.product_id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.unit_price}
                          onChange={(e) => handlePriceChange(product.product_id, parseFloat(e.target.value) || 0)}
                          className="w-24 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {formatCurrency(product.quantity * product.unit_price)}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mt-1"
                        onClick={() => handleRemoveProduct(product.product_id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Valor Adicional e Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="additional-value">Valor Adicional</Label>
              <Input
                id="additional-value"
                type="number"
                step="0.01"
                min="0"
                value={additionalValue}
                onChange={(e) => setAdditionalValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total com breakdown */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            {showBreakdown && (
              <div className="text-sm text-muted-foreground space-y-1">
                {hasManualValue ? (
                  <div className="flex justify-between">
                    <span>Valor Manual</span>
                    <span>{formatCurrency(parseFloat(manualValue))}</span>
                  </div>
                ) : selectedProducts.length > 0 && (
                  <div className="flex justify-between">
                    <span>Subtotal Produtos</span>
                    <span>{formatCurrency(productsSubtotal)}</span>
                  </div>
                )}
                {hasAdditional && (
                  <div className="flex justify-between text-green-600">
                    <span>+ Valor Adicional</span>
                    <span>{formatCurrency(parseFloat(additionalValue))}</span>
                  </div>
                )}
                {hasDiscount && (
                  <div className="flex justify-between text-red-500">
                    <span>- Desconto</span>
                    <span>-{formatCurrency(parseFloat(discount))}</span>
                  </div>
                )}
              </div>
            )}
            <div className={`flex items-center justify-between ${showBreakdown ? 'pt-2 border-t border-primary/20' : ''}`}>
              <span className="font-medium">Total da Proposta</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações da Negociação</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre a negociação..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProposal.isPending}>
              {createProposal.isPending ? 'A criar...' : 'Criar Proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
