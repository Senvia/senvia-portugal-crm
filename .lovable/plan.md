

## Correção: Formulário de Proposta Completo para Nichos Não-Telecom

### Problema Identificado

Ao esconder os campos específicos de telecom (CPEs, Tipo de Proposta, Energia, etc.), o formulário de criação/edição de propostas ficou incompleto para outros nichos:

| O que falta | Impacto |
|-------------|---------|
| Campo "Valor da Proposta" | Não há forma de definir o valor manualmente |
| Seletor de Produtos | Não há como adicionar produtos da organização |
| Observações contextuais | O label "Notas" é genérico |

### Solução

Adicionar uma secção para **nichos NÃO-telecom** com:

1. **Campo "Valor da Proposta"** - Input numérico para inserir o valor total manualmente
2. **Seletor de Produtos/Serviços** - Lista dos produtos da organização com quantidade e preço
3. **Melhoria do campo Notas** - Renomear para "Observações da Negociação"

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/CreateProposalModal.tsx` | Adicionar secção genérica com valor + produtos |
| `src/components/proposals/EditProposalModal.tsx` | Mesmo tratamento para edição |

---

### Alterações em CreateProposalModal.tsx

**1. Adicionar imports e hooks:**
```tsx
import { useProducts } from '@/hooks/useProducts';
```

**2. Adicionar estados para nichos não-telecom:**
```tsx
// Campos para nichos NÃO-telecom
const [manualValue, setManualValue] = useState<string>('');
const [selectedProducts, setSelectedProducts] = useState<Array<{
  product_id: string;
  quantity: number;
  unit_price: number;
}>>([]);
```

**3. Buscar produtos:**
```tsx
const { data: products = [] } = useProducts();
```

**4. Nova secção para nichos NÃO-telecom (após o grid de data/estado):**
```tsx
{/* Campos para nichos NÃO-telecom */}
{!isTelecom && (
  <div className="space-y-4">
    {/* Valor da Proposta */}
    <div className="space-y-2">
      <Label htmlFor="manual-value">Valor da Proposta (€)</Label>
      <Input
        id="manual-value"
        type="number"
        step="0.01"
        min="0"
        value={manualValue}
        onChange={(e) => setManualValue(e.target.value)}
        placeholder="Ex: 1500.00"
      />
    </div>
    
    {/* Produtos/Serviços (se houver produtos cadastrados) */}
    {products.length > 0 && (
      <div className="space-y-2">
        <Label>Produtos/Serviços</Label>
        {/* Seletor de produtos com quantidade */}
        ...
      </div>
    )}
  </div>
)}
```

**5. Renomear campo Notas:**
```tsx
<Label htmlFor="notes">Observações da Negociação</Label>
<Textarea
  id="notes"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Detalhes da negociação, condições especiais, etc..."
  rows={3}
/>
```

**6. Atualizar cálculo do valor total:**
```tsx
const calculatedTotalValue = useMemo(() => {
  if (isTelecom) {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.margem) || 0), 0);
    }
    return 0;
  }
  // Para não-telecom: usar valor manual + produtos
  const productsTotal = selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  return productsTotal + (parseFloat(manualValue) || 0);
}, [isTelecom, proposalType, proposalCpes, selectedProducts, manualValue]);
```

---

### Alterações em EditProposalModal.tsx

Aplicar a mesma lógica:
1. Carregar produtos da organização
2. Campo de valor manual para nichos não-telecom
3. Seletor de produtos
4. Preencher valores ao abrir modal

---

### Resumo Visual por Nicho

| Campo | Telecom | Generic/Clinic/Construction/etc |
|-------|---------|--------------------------------|
| Cliente | ✓ | ✓ |
| Data | ✓ | ✓ |
| Estado | ✓ | ✓ |
| Tipo Negociação | ✓ | - |
| Tipo Proposta | ✓ | - |
| CPE Selector | ✓ (energia) | - |
| Campos Serviços | ✓ (serviços) | - |
| **Valor Manual** | - | **✓** |
| **Produtos/Serviços** | - | **✓** |
| Observações | ✓ | ✓ |

---

### Detalhes Técnicos

O formulário de propostas será adaptativo:
- **Telecom**: Mantém toda a lógica atual (CPEs, Energia, Serviços)
- **Outros nichos**: Formulário simplificado com valor manual e produtos do catálogo

Isto permite que clínicas, imobiliárias, construção civil, etc. criem propostas com os seus próprios produtos/serviços configurados nas definições.

