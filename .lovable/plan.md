

## Fix: Estado "Ganho" só aplica se a venda for gravada

### Problema
Quando um lead é arrastado para a etapa "Ganho", o `updateStatus.mutate()` é chamado imediatamente (linha 312), antes de o utilizador gravar a venda. Se fechar o modal sem gravar, o lead fica em "Ganho" sem venda associada.

### Solução — `src/pages/Leads.tsx`

1. **Adicionar estado para guardar o lead/status pendente do won:**
   - `pendingWonData: { leadId: string; status: string } | null`

2. **No `handleStatusChange`, bloquear o `updateStatus.mutate` quando é won stage:**
   - Guardar o `leadId` e `newStatus` em `pendingWonData`
   - Abrir o modal de venda normalmente
   - **NÃO** chamar `updateStatus.mutate` para won (remover da linha 312 para won)

3. **Usar o callback `onSaleCreated` no `CreateSaleModal`:**
   - Quando a venda é gravada com sucesso → chamar `updateStatus.mutate` com o `pendingWonData`
   - Limpar o estado pendente

4. **No `onOpenChange` do `CreateSaleModal`:**
   - Se o modal fechar sem venda gravada (pendingWonData ainda existe) → não alterar o status (lead mantém estado anterior)
   - Limpar `pendingWonData`

### Alterações concretas

**Linha ~86** — Adicionar estado:
```typescript
const [pendingWonData, setPendingWonData] = useState<{ leadId: string; status: string } | null>(null);
```

**Linhas 282-312** — No bloco `isWonStage`, guardar pendingWonData em vez de mutar status:
```typescript
if (isWonStage(newStatus) && lead) {
  setPendingWonData({ leadId, status: newStatus });
  // ... resto da lógica de criar cliente + abrir modal mantém-se
  // REMOVER: updateStatus.mutate({ leadId, status: newStatus }) para este caso
  return; // Não cair no mutate genérico da linha 312
}
```

**Linhas 810-817** — Adicionar `onSaleCreated` e atualizar `onOpenChange`:
```typescript
<CreateSaleModal
  open={isCreateSaleModalOpen}
  onOpenChange={(open) => {
    setIsCreateSaleModalOpen(open);
    if (!open) {
      setPrefillSaleClientId(null);
      setPendingWonData(null); // Limpa sem alterar status
    }
  }}
  prefillClientId={prefillSaleClientId}
  onSaleCreated={() => {
    if (pendingWonData) {
      updateStatus.mutate({ leadId: pendingWonData.leadId, status: pendingWonData.status });
      setPendingWonData(null);
    }
  }}
/>
```

### Resultado
- Lead só passa para "Ganho" quando a venda é efetivamente gravada
- Se fechar o modal sem gravar, o lead mantém o estado anterior
- 1 ficheiro editado: `src/pages/Leads.tsx`

