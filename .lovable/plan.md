

## Plano: Adicionar coluna "Tipo Negociação" no detalhe de comissões

O campo `negotiation_type` já existe em cada CPE detail (`CpeDetail.negotiation_type`) no hook. Só falta mostrar na UI.

### Alterações

**1. `src/components/finance/CommissionsTab.tsx`**
- Adicionar `<TableHead>Tipo</TableHead>` após "Venda" no header do detalhe expandido
- Adicionar `<TableCell>` com Badge mostrando o label traduzido
- Labels: `angariacao` → "Angariação", `angariacao_indexado` → "Ang. Indexado", `renovacao` → "Renovação", `sem_volume` → "Sem Volume"

**2. `src/hooks/useLiveCommissions.ts`**
- Remover o filtro `VALID_NEGOTIATION_TYPES` que exclui `renovacao` e `sem_volume` — para que todos os tipos apareçam nas comissões
- Ou manter o filtro se apenas angariação deve ter comissão calculada — depende da intenção

### Questão pendente
Atualmente o hook filtra apenas `angariacao` e `angariacao_indexado`. Se queres ver também `renovacao` e `sem_volume` nas comissões, o filtro tem de ser removido.

