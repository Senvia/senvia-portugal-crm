

## Corrigir badge "Renovação" — mostrar apenas quando `negotiation_type === 'renovacao'`

Atualmente o badge usa `existing_cpe_id` para decidir se mostra "Renovação" ou "Novo". O correto é usar o campo `negotiation_type` da venda/proposta.

### Alterações em 3 ficheiros:

**1. `src/components/sales/CreateSaleModal.tsx` (linhas 900-904)**
- Trocar `cpe.existing_cpe_id` por `negotiationType === 'renovacao'`
- A variável `negotiationType` já existe como state

**2. `src/components/sales/SaleDetailsModal.tsx` (linhas 530-534)**
- Trocar `cpe.existing_cpe_id` por `sale.negotiation_type === 'renovacao'`
- `sale` já tem `negotiation_type` disponível

**3. `src/components/sales/EditSaleModal.tsx` (linhas 762-766)**
- Trocar `cpe.existing_cpe_id` por `negotiationType === 'renovacao'`
- A variável `negotiationType` já existe como state

Também remover o texto técnico da regra de comissão (`getTierRuleLabel`) que aparece por baixo da comissão no `CreateSaleModal.tsx`.

