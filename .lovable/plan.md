
Objetivo

Mudar a distribuição de prospects para funcionar por seleção manual na tela:
- o utilizador seleciona prospects na lista
- o botão “Distribuir leads” só fica ativo quando houver prospects elegíveis selecionados
- ao abrir o modal, ele mostra a quantidade exata dos prospects selecionados que vão ser distribuídos

O que encontrei

- Hoje a página `src/pages/Prospects.tsx` não tem seleção por linha.
- O modal `src/components/prospects/DistributeProspectsDialog.tsx` trabalha por `remainingCount` + input manual de quantidade.
- O hook `useDistributeProspects()` só envia `quantity`.
- A função de backend `distribute_prospects_round_robin(...)` distribui os primeiros prospects disponíveis por ordem, não uma lista específica escolhida pelo utilizador.

O que vou implementar

1. Seleção de prospects na lista
- Adicionar checkboxes na tabela de prospects, com:
  - selecionar uma linha
  - selecionar todos os resultados filtrados
- Nos cards mobile, adicionar seleção por item também.
- Guardar `selectedIds` na página de prospects.

2. Só permitir seleção de prospects elegíveis
- Considerar elegíveis apenas prospects que:
  - ainda não foram convertidos
  - não estão atribuídos
- Prospects já convertidos ou já atribuídos:
  - não entram na seleção
  - podem aparecer desativados visualmente, para ficar claro

3. Botão “Distribuir leads” baseado na seleção
- O botão deixa de depender do total restante.
- Passa a depender de `selectedEligibleProspects.length > 0`.
- O texto e/ou estado do botão pode refletir a seleção:
  - ex.: “Distribuir leads (12)”

4. Novo comportamento do modal
- Remover o input manual de quantidade.
- O modal passa a mostrar:
  - quantidade selecionada que será distribuída
  - lista de comerciais elegíveis
  - mensagem de confirmação da ação
- O utilizador confirma, e o sistema distribui exatamente os prospects selecionados.

5. Distribuição por IDs selecionados
- Atualizar o backend para distribuir uma lista explícita de prospects selecionados, em vez de apenas “os primeiros N”.
- A lógica de round-robin mantém-se, mas aplicada somente aos IDs recebidos.
- Continuar a converter cada prospect distribuído em lead, como já acontece hoje.

6. Limpeza e consistência da seleção
- Limpar seleção depois de distribuir com sucesso.
- Limpar seleção quando filtros mudarem, para evitar seleção invisível.
- Garantir que export/import continuam independentes desta mudança.

Ficheiros a ajustar

- `src/pages/Prospects.tsx`
- `src/components/prospects/DistributeProspectsDialog.tsx`
- `src/hooks/useProspects.ts`
- `src/types/prospects.ts` se eu tipar melhor o payload da distribuição
- migration no backend para atualizar a função `distribute_prospects_round_robin(...)`

Detalhe técnico

Frontend:
- adicionar `selectedIds` em `Prospects.tsx`
- calcular:
  - `selectedProspects`
  - `selectedEligibleProspects`
- passar para o modal algo como:
  - `selectedCount`
  - `selectedIds`
  - `salespeople`

Backend:
- a função atual precisa de aceitar algo como `p_prospect_ids uuid[]`
- no `FOR ... IN SELECT`, trocar o critério de `LIMIT p_quantity` por filtro explícito:
  - `id = ANY(p_prospect_ids)`
  - `converted_to_lead = false`
  - `assigned_to IS NULL`
- o resultado continua a devolver quantos foram distribuídos e convertidos

Resultado esperado

- Deixas de distribuir “por quantidade genérica”.
- Passas a escolher exatamente quais prospects queres distribuir.
- O modal mostra a quantidade real dos selecionados.
- O round-robin continua automático, mas agora sobre os prospects que escolheste na tela.
