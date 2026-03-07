

## Abrir Modal de Venda ao mover Lead para "Ganho"

### Problema
Quando um lead e movido para a etapa final positiva (Ganho), o sistema converte automaticamente em cliente e redireciona para `/clients`. Nao abre o modal de criacao de venda como esperado.

### Solucao
Alterar o fluxo "won" no `src/pages/Leads.tsx` para:
1. Converter lead em cliente (manter logica atual)
2. Em vez de redirecionar para `/clients`, **abrir o `CreateSaleModal`** com o `prefillClientId` do cliente criado/existente

### Alteracoes — 1 ficheiro

**`src/pages/Leads.tsx`**

1. **Importar** `CreateSaleModal` de `@/components/sales/CreateSaleModal`
2. **Adicionar estados**:
   - `isCreateSaleModalOpen` (boolean)
   - `prefillSaleClientId` (string | null)
3. **Modificar o bloco `isWonStage`** (linhas 279-304):
   - Cliente existente: em vez de `navigate(...)`, setar `prefillSaleClientId = existingClient.id` e abrir o modal de venda
   - Cliente novo (onSuccess do convertLeadToClient): setar `prefillSaleClientId = newClient.id` e abrir o modal de venda
   - Remover os `navigate(...)` e os `toast.success` (o modal de venda ja dara feedback)
4. **Renderizar** `<CreateSaleModal>` no JSX com `prefillClientId={prefillSaleClientId}`

### Fluxo resultante
```text
Lead arrastado para "Ganho"
  → Cliente ja existe? Usa existente : Cria novo
  → Atualiza status do lead para "ganho"
  → Abre CreateSaleModal pre-preenchido com o cliente
```

