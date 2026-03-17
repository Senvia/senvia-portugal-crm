
Objetivo

Criar no Financeiro da Perfect2Gether uma nova aba “Análise de Comissões”, visível apenas para admins, com:
- cards por comercial
- comissão atual
- chargeback do comercial
- diferencial
- importação de ficheiro de chargebacks por CPE
- contagem da quantidade de chargebacks presentes no ficheiro

O que confirmei no projeto
- O Financeiro já usa tabs em `src/pages/Finance.tsx`.
- Já existe um padrão forte para comissões em `src/components/finance/CommissionsTab.tsx` e `src/hooks/useLiveCommissions.ts`.
- Já existe um componente reutilizável de upload/import em `src/components/marketing/import/ImportStep1Upload.tsx`.
- A Perfect2Gether já é tratada com `hasPerfect2GetherAccess(...)`.
- O controlo de admin no frontend já existe via `usePermissions().isAdmin`.
- Não existe hoje nenhuma feature/tabela de chargebacks.

Regras já definidas
- A aba será só para admins.
- A associação do chargeback ao comercial será feita pelo CPE.
- O card de chargeback deve mostrar quantidade + valor €.
- O card de diferencial deve mostrar ambos:
  - diferença em €
  - diferença em quantidade
- No importador, o campo a mapear manualmente será o CPE.

Plano de implementação

1. Mostrar a nova aba apenas no contexto certo
- Em `src/pages/Finance.tsx`, acrescentar a aba `analise-comissoes`.
- Mostrar essa aba apenas quando:
  - a organização ativa for a Perfect2Gether
  - o utilizador for admin
- Atualizar `validTabs` para evitar tabs inválidas quando o utilizador não tiver acesso.

2. Criar armazenamento próprio para imports de chargeback
- Adicionar novas tabelas no backend:
  - `commission_chargeback_imports`
    - guarda o ficheiro importado, organização, utilizador, data e resumo
  - `commission_chargeback_items`
    - guarda cada linha importada com:
      - `organization_id`
      - `import_id`
      - `cpe`
      - `chargeback_amount`
      - `matched_proposal_cpe_id`
      - `matched_proposal_id`
      - `matched_sale_id`
      - `matched_user_id`
      - `raw_row`
- Criar políticas RLS admin-only por organização.
- Criar função helper de permissão org-admin para usar nas policies com segurança.

3. Fazer o matching do ficheiro pelo CPE
- No import:
  - normalizar o CPE do ficheiro
  - cruzar com `proposal_cpes.serial_number`
  - daí resolver:
    - proposta
    - venda
    - comercial responsável
- Para atribuição do comercial:
  - usar a lógica de vendas/comissões já existente como base
  - com fallback para dados históricos quando necessário
- Se um CPE não encontrar correspondência:
  - a linha continua guardada
  - entra como “não associada”
  - aparece no resumo de importação

4. Criar o fluxo de importação na nova aba
- Reutilizar `ImportStep1Upload`.
- Criar um modal/dialog específico para “Importar Chargebacks”.
- Como pediste mapping manual só do CPE:
  - o importador terá seleção da coluna CPE
  - o valor de chargeback será lido a partir de coluna padrão do ficheiro/layout esperado
- Mostrar resumo após import:
  - total de linhas do ficheiro
  - quantidade total de chargebacks
  - total em €
  - quantas linhas foram associadas
  - quantas ficaram sem match

5. Criar o hook de análise
- Criar um hook dedicado para a nova aba, algo como `useCommissionAnalysis`.
- Esse hook vai combinar:
  - comissões por comercial
  - chargebacks importados por comercial
- Saída por comercial:
  - `commissionAmount`
  - `chargebackCount`
  - `chargebackAmount`
  - `differentialAmount = commissionAmount - chargebackAmount`
  - `differentialCount = sales/itens com comissão - chargebackCount` ou outro contador coerente com o card
- Ordenar por maior impacto e preparar dados para cards e tabela.

6. Construir a UI da aba “Análise de Comissões”
- Estrutura sugerida:
  - topo com botão “Importar ficheiro”
  - cards resumo globais
  - grelha/lista de cards por comercial
  - tabela detalhada opcional por baixo
- Em cada card de comercial:
  - nome do comercial
  - comissão total
  - chargeback: quantidade + €
  - diferencial: € + quantidade
- Incluir estado vazio e alertas para imports sem correspondência.

7. Preservar segurança e isolamento
- A aba não aparece para não-admins.
- O backend também bloqueia leitura/importação para não-admins.
- Tudo filtrado por organização ativa.
- Nada fica dependente só da UI para segurança.

Resultado esperado
- Dentro do Financeiro da Perfect2Gether passa a existir a aba “Análise de Comissões”.
- Só admins a conseguem ver e usar.
- Após importar o ficheiro, o sistema:
  - conta quantos chargebacks existem no ficheiro
  - associa cada linha pelo CPE
  - agrega por comercial
  - mostra comissão, chargeback e diferencial de cada comercial

Ficheiros mais prováveis
- `src/pages/Finance.tsx`
- novo componente em `src/components/finance/...`
- novo hook em `src/hooks/...`
- nova migration para tabelas/funções/policies

Detalhes técnicos
```text
match principal:
ficheiro.CPE -> proposal_cpes.serial_number -> proposal_id -> sale_id -> comercial

cards por comercial:
comissão = total das comissões do comercial
chargeback = soma em € + contagem de linhas importadas com match nesse comercial
diferencial € = comissão - chargeback €
diferencial qtd = métrica base - quantidade chargebacks
```

Validação
- Entrar no Financeiro com admin da Perfect2Gether:
  - a aba deve aparecer
- Entrar com utilizador não-admin:
  - a aba não deve aparecer
- Importar ficheiro com CPEs válidos:
  - os chargebacks devem ser contados e associados aos comerciais certos
- Importar ficheiro com CPEs inválidos:
  - devem ficar no resumo como não associados
- Confirmar que os cards mostram:
  - comissão
  - chargeback (quantidade + €)
  - diferencial (€ + quantidade)
