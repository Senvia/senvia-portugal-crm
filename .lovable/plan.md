

## Adicionar campo CPE editável nas leads da P2G + auto-preencher no cliente

### Contexto
Para a P2G, os prospects já trazem CPE no `custom_data.cpe` ao serem convertidos em leads. Mas o utilizador também quer poder **adicionar/editar CPE directamente na lead** (mesmo sem vir de prospect). E ao converter lead → cliente, o CPE deve ser criado automaticamente na tabela `cpes`.

### Implementação

#### 1) LeadDetailsModal — campo CPE editável (apenas P2G)
**Ficheiro: `src/components/leads/LeadDetailsModal.tsx`**

- Importar `isPerfect2GetherOrg` de `@/lib/perfect2gether`
- Adicionar estado `editCpe` e `isEditingCpe`
- Sincronizar com `lead.custom_data?.cpe` no useEffect
- Ao fazer blur, guardar via `onUpdate(lead.id, { custom_data: { ...lead.custom_data, cpe: editCpe } })`
- Renderizar um novo Card "CPE/CUI" (com ícone `Zap`) entre o card de Consumo e o de Notas, **apenas quando** `isPerfect2GetherOrg(organization?.id)`
- Input de texto simples com placeholder "PT00..."

#### 2) Conversão lead → cliente — auto-criar CPE
**Ficheiro: `src/hooks/useClients.ts`** — função `useConvertLeadToClient`

- Alterar select da lead para incluir `custom_data`: `.select('assigned_to, custom_data')`
- Após criar o cliente com sucesso, verificar se `lead.custom_data?.cpe` existe e se org é P2G
- Se sim, inserir registo na tabela `cpes`:
  ```ts
  { client_id, organization_id, equipment_type: 'Energia', serial_number: cpeValue, comercializador: '', status: 'active' }
  ```

### Ficheiros alterados
- `src/components/leads/LeadDetailsModal.tsx` — campo CPE editável para P2G
- `src/hooks/useClients.ts` — auto-criar CPE ao converter lead em cliente (P2G)

