
Objetivo

Ajustar os cards “Serviços — Mensal” e “Serviços — Anual” para somarem todos os serviços exceto “Coberturas”.

O que encontrei
- A lógica dos cards está em `src/hooks/useActivationObjectives.ts`.
- Hoje, para `proposal_type = "servicos"`, o total é calculado somando `kwp` de todos os produtos em `servicos_details`.
- Isso inclui `Coberturas` indiretamente, embora esse produto nem tenha `kwp` definido no config legacy.
- O painel que consome esta lógica é `src/components/dashboard/ActivationsPanel.tsx`.
- A definição de produtos mostra explicitamente `Coberturas` em `src/types/proposals.ts`.

Regra confirmada
- Propostas com serviços mistos devem contar.
- Apenas o produto `Coberturas` deve ser ignorado na soma.
- Se uma proposta tiver só `Coberturas`, o total de serviços dessa proposta fica 0.

Plano de implementação
1. Ajustar a agregação de serviços no hook
- Em `useActivationObjectives.ts`, alterar a construção de `kwpByProposal`.
- Ao percorrer `servicos_details`, ignorar a chave/produto `Coberturas`.
- Continuar a somar normalmente todos os restantes produtos.

2. Preservar comportamento do dashboard
- Não mexer no layout dos cards em `ActivationsPanel.tsx`.
- Os cards mensal e anual vão refletir automaticamente a nova regra porque usam `countActivations(..., "servicos")`.

3. Garantir compatibilidade com dados existentes
- Tratar a exclusão de forma robusta, comparando o nome do produto normalizado para evitar falhas por capitalização/acentos se existirem variantes.
- Não alterar energia nem outras métricas.

Resultado esperado
- “Serviços — Mensal” e “Serviços — Anual” deixam de considerar Coberturas.
- Propostas com Solar/Baterias/etc. + Coberturas contam apenas o valor dos outros serviços.
- Propostas com apenas Coberturas passam a contribuir 0 para os cards.

Ficheiros a alterar
- `src/hooks/useActivationObjectives.ts`

Validação
- Testar uma proposta com apenas `Coberturas` → deve contribuir 0.
- Testar uma proposta com `Coberturas` + outro serviço → deve contar só o outro serviço.
- Confirmar que os cards mensal e anual mudam sem afetar Energia.
