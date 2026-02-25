

## Recalcular Comissão ao Mudar Transacional/SAAS

### Problema

Quando o utilizador alterna entre **Transacional** e **SAAS**, a comissão **não recalcula** nas propostas. A razão: o recálculo só acontece dentro de `handleUpdateProductDetail` (quando se altera um campo de produto), mas não quando `modeloServico` muda.

- **CreateProposalModal**: `setModeloServico('saas')` é chamado, mas nenhum `useEffect` recalcula as comissões dos produtos activos.
- **EditProposalModal**: Mesmo problema — `setModeloServico` não dispara recálculo.
- **EditSaleModal**: Já tem `useEffect` com `modeloServico` nos deps — funciona correctamente.
- **CreateSaleModal**: Usa `recalcComissaoFromProposal` no prefill (uma vez) — não há edição de modelo no Create, então não se aplica.

### Solução

Adicionar um `useEffect` em **CreateProposalModal** e **EditProposalModal** que reage a mudanças em `modeloServico` e recalcula a comissão de todos os produtos activos usando `calculateCommission`.

### Alterações por ficheiro

#### 1. `src/components/proposals/CreateProposalModal.tsx`

Adicionar `useEffect` após a definição de `handleUpdateProductDetail`:

```typescript
useEffect(() => {
  if (proposalType !== 'servicos' || servicosProdutos.length === 0) return;
  setServicosDetails(prev => {
    const updated = { ...prev };
    for (const prodName of servicosProdutos) {
      const detail = { ...updated[prodName] };
      const config = SERVICOS_PRODUCT_CONFIGS.find(c => c.name === prodName);
      if (config?.kwpAuto) {
        const autoKwp = config.kwpAuto(detail);
        if (autoKwp !== null) detail.kwp = Math.round(autoKwp * 100) / 100;
      }
      const calc = calculateCommission(prodName, detail, modeloServico);
      if (calc !== null) detail.comissao = Math.round(calc * 100) / 100;
      updated[prodName] = detail;
    }
    return updated;
  });
}, [modeloServico]);
```

#### 2. `src/components/proposals/EditProposalModal.tsx`

Adicionar o mesmo `useEffect` após `handleUpdateProductDetail`:

```typescript
useEffect(() => {
  if (proposalType !== 'servicos' || servicosProdutos.length === 0) return;
  setServicosDetails(prev => {
    const updated = { ...prev };
    for (const prodName of servicosProdutos) {
      const detail = { ...updated[prodName] };
      const config = SERVICOS_PRODUCT_CONFIGS.find(c => c.name === prodName);
      if (config?.kwpAuto) {
        const autoKwp = config.kwpAuto(detail);
        if (autoKwp !== null) detail.kwp = Math.round(autoKwp * 100) / 100;
      }
      const calc = calculateCommission(prodName, detail, modeloServico);
      if (calc !== null) detail.comissao = Math.round(calc * 100) / 100;
      updated[prodName] = detail;
    }
    return updated;
  });
}, [modeloServico]);
```

### Ficheiros a alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/proposals/CreateProposalModal.tsx` | Novo `useEffect` que recalcula comissões de todos os produtos quando `modeloServico` muda |
| `src/components/proposals/EditProposalModal.tsx` | Mesmo `useEffect` para recalcular ao alternar Transacional/SAAS |

### Detalhe técnico

- O `useEffect` usa `setServicosDetails` com callback funcional para garantir que lê o estado mais recente
- A lógica de recálculo é idêntica à que já existe em `handleUpdateProductDetail` — reutiliza `calculateCommission` e `kwpAuto`
- Nas vendas (`EditSaleModal`), o `useEffect` na linha 221-242 já inclui `modeloServico` nos deps, portanto já funciona correctamente
- `CreateSaleModal` não precisa de alteração porque o modelo de serviço não é editável na criação (vem da proposta)

