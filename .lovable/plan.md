
Diagnóstico confirmado
1. A venda 0012 está a ser carregada no módulo de comissões (request de vendas entregues de fevereiro retorna 0011 e 0012).
2. A 0012 passa todos os filtros da lógica atual:
   - `status = delivered`
   - `activation_date` dentro do mês
   - proposta com `negotiation_type = angariacao_indexado`
   - existe `proposal_cpe` associado
   - cliente com vendedor responsável (`crm_clients.assigned_to = Nuno`)
3. O motivo da perceção de “não aparece” é visual: a tabela detalhada mostra **CPE/CUI**, não mostra **código da venda** (`0012`).

Plano curto de implementação
1. Em `useLiveCommissions.ts`, incluir `code` no select de `sales` e propagar `sale_code` para cada item de detalhe.
2. Em `CommissionsTab.tsx`, adicionar coluna **Venda** no detalhe expandido (ex.: `0011`, `0012`).
3. Manter coluna **CPE/CUI** e mostrar ambos para rastreabilidade (venda + CPE).
4. Validar no mês de fevereiro: ao expandir Nuno, devem aparecer explicitamente as linhas com `0011` e `0012`.

Detalhes técnicos
- Arquivos: `src/hooks/useLiveCommissions.ts`, `src/components/finance/CommissionsTab.tsx`
- Sem alterações de base de dados.
- Sem alteração de regra de cálculo; apenas melhoria de identificação na UI.
