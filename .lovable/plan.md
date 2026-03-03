

## Abrir Modal de Venda ao Ganhar Lead

### Situação atual

Quando uma lead é marcada como "Ganha", o sistema:
1. Cria o cliente automaticamente (se não existe)
2. Atualiza o status da lead
3. Mostra um toast "Lead ganha! Cliente criado automaticamente."

**Mas não abre nenhum modal de venda.** O fluxo termina aí.

### Solução

Alterar o fluxo em `src/pages/Leads.tsx` para que, após a lead ser ganha e o cliente criado/identificado, o `CreateSaleModal` seja aberto automaticamente com o `prefillClientId` pré-preenchido.

**`src/pages/Leads.tsx`**:
- Importar `CreateSaleModal`
- Adicionar estados: `isCreateSaleModalOpen` e `wonClientId`
- No bloco `isWonStage` (linhas 272-296):
  - Se já existe cliente: guardar o `clientId`, atualizar status, e abrir o modal de venda
  - Se não existe: no `onSuccess` do `convertLeadToClient`, guardar o novo `clientId` e abrir o modal de venda
- Renderizar `<CreateSaleModal open={isCreateSaleModalOpen} onOpenChange={setIsCreateSaleModalOpen} prefillClientId={wonClientId} />`

O `CreateSaleModal` já suporta `prefillClientId`, portanto o utilizador verá o modal com o cliente pré-selecionado, pronto para registar a venda.

