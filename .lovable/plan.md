

## Correcoes no Template Telecom - CPE/CUI na Proposta

### Resumo do Pedido

O cliente do nicho "telecom" (energia) pediu:

1. Na proposta, ao selecionar cliente, mostrar combobox com todos os CPE/CUI do cliente
2. Preenchimento individual: selecionar CPE, preencher dados de energia, adicionar, repetir
3. Quando proposta e ganha: atualizar fidelizacao dos CPE/CUI na ficha do cliente e definir comercializador como "EDP"

---

### Analise do Estado Atual

**O que JA funciona corretamente:**

- Combobox de CPEs do cliente existe na aba "Renovar Existente"
- Preenchimento um a um funciona (seleciona, preenche, adiciona)
- Quando proposta e aceite, CPEs sao atualizados no CreateSaleModal

**O que precisa de ser corrigido:**

O comercializador NAO esta a ser definido como "EDP" fixo - atualmente usa o valor da proposta

---

### Alteracoes Propostas

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/CreateSaleModal.tsx` | Ao processar CPEs de proposta aceite, forcar comercializador = "EDP Comercial" |

---

### Detalhes Tecnicos

#### 1. Atualizacao de CPEs com Comercializador Fixo (CreateSaleModal.tsx)

Na secao onde os CPEs sao processados (linhas 526-552), alterar para usar sempre "EDP Comercial":

```typescript
// Process CPEs - criar novos ou atualizar existentes
if (proposalCpes.length > 0 && clientId) {
  for (const proposalCpe of proposalCpes) {
    if (proposalCpe.existing_cpe_id) {
      // Atualizar CPE existente (renovacao)
      await updateCpe.mutateAsync({
        id: proposalCpe.existing_cpe_id,
        comercializador: 'EDP Comercial', // <-- FIXO: sempre EDP
        fidelizacao_start: proposalCpe.contrato_inicio || proposalCpe.fidelizacao_start || undefined,
        fidelizacao_end: proposalCpe.contrato_fim || proposalCpe.fidelizacao_end || undefined,
        notes: proposalCpe.notes || undefined,
        status: 'active', // Reativar se estava inativo
      });
    } else {
      // Criar novo CPE
      await createCpe.mutateAsync({
        client_id: clientId,
        equipment_type: proposalCpe.equipment_type,
        comercializador: 'EDP Comercial', // <-- FIXO: sempre EDP
        serial_number: proposalCpe.serial_number || undefined,
        fidelizacao_start: proposalCpe.contrato_inicio || proposalCpe.fidelizacao_start || undefined,
        fidelizacao_end: proposalCpe.contrato_fim || proposalCpe.fidelizacao_end || undefined,
        notes: proposalCpe.notes || undefined,
        status: 'active',
      });
    }
  }
}
```

---

### Comportamento Final

| Cenario | Resultado |
|---------|-----------|
| Criar proposta | Seleciona CPE existente ou cria novo, preenche dados um a um |
| Proposta aceite (ganha) | CPE atualizado com comercializador "EDP Comercial" e novas datas de fidelizacao |
| CPE inativo renovado | Status muda para "active" |
| Novo CPE criado | Criado com comercializador "EDP Comercial" e status "active" |

---

### Nota Importante

Se o cliente nao quiser que o comercializador seja SEMPRE "EDP", posso ajustar para:
- Manter o comercializador da proposta (comportamento atual)
- Ou dar opcao de escolher no momento da conversao

**Total: 1 ficheiro modificado**

