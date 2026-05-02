## O que encontrei
- O **Rafael recebeu 1 lead ontem**: `Filipe Pereira` em **2026-05-01 19:17 UTC**.
- A causa principal é que a pausa dos 3 comerciais estava configurada com **`paused_until = 2026-04-30 23:00:00+00`**. Ou seja: **a pausa já tinha expirado** quando esse lead entrou no dia 1.
- Além disso, encontrei uma fragilidade real no sistema: a pausa hoje só está protegida em alguns fluxos.
  - O `submit-lead` já exclui pausados no round-robin.
  - Mas o fluxo de **criação manual de lead** (`useCreateLead`) **não filtra `paused_until`**.
  - E a UI de atribuição manual/bulk ainda mostra membros pausados como elegíveis.
- Não encontrei formulário da organização com responsável fixo para o Rafael/Pedro/Bernardo, então o problema não veio daí.

## Plano
1. **Corrigir imediatamente os dados da organização Escolha Inteligente**
   - Reaplicar a pausa para **Rafael Camilo, Pedro Rodrigues e Bernardo Marinho** com nova validade futura.
   - Identificar todos os leads recentes atribuídos a qualquer um dos 3 após o período em que não deveriam receber.
   - **Redistribuir esses leads** pelos próximos comerciais ativos elegíveis, respeitando a rotação atual e excluindo admins e pausados.

2. **Fechar a falha no fluxo automático e manual**
   - Atualizar o fluxo de criação manual de leads (`useCreateLead`) para usar o mesmo filtro de elegibilidade do round-robin: ativo, não admin quando aplicável, e **não pausado**.
   - Corrigir também o uso de `round_robin_index` para não voltar a apontar para comerciais pausados.

3. **Bloquear atribuição manual a comerciais pausados**
   - Atualizar `get-team-members` para devolver `paused_until`.
   - Atualizar os seletores de atribuição em:
     - `AddLeadModal`
     - `LeadDetailsModal`
     - `AssignTeamMemberModal`
   - Comportamento:
     - comerciais pausados aparecem como **“Pausado”** ou deixam de aparecer como opção elegível;
     - se alguém tentar gravar uma atribuição inválida, o sistema mostra erro e impede a operação.

4. **Adicionar proteção no backend/database para garantir a regra**
   - Criar uma proteção central para impedir que um lead seja gravado com `assigned_to` apontando para um membro pausado da mesma organização.
   - Assim a regra deixa de depender só da UI e passa a valer mesmo se houver outro fluxo futuro, importação ou chamada indireta.

5. **Validar os cenários críticos**
   - Lead via formulário/webhook.
   - Lead criado manualmente sem responsável escolhido.
   - Lead criado manualmente com responsável escolhido.
   - Reatribuição individual e em massa.
   - Confirmar no fim que **Rafael, Pedro e Bernardo deixam de receber novos leads**.

## Resultado esperado
- Os 3 comerciais deixam de receber **qualquer novo lead** enquanto estiverem pausados.
- Os leads que entraram indevidamente ficam **redistribuídos para os próximos comerciais válidos**.
- A regra passa a ser consistente em todos os pontos do sistema, não só no round-robin do formulário.

## Detalhes técnicos
- Arquivos a ajustar:
  - `src/hooks/useLeads.ts`
  - `src/hooks/useTeam.ts`
  - `src/components/leads/AddLeadModal.tsx`
  - `src/components/leads/LeadDetailsModal.tsx`
  - `src/components/shared/AssignTeamMemberModal.tsx`
  - `supabase/functions/submit-lead/index.ts`
  - nova migration para proteção estrutural
- Dados confirmados agora:
  - Organização: **Escolha Inteligente**
  - Rafael, Pedro e Bernardo estavam com pausa até **2026-04-30 23:00 UTC**
  - Lead indevido confirmado: **Filipe Pereira** → **Rafael Camilo** em **2026-05-01**

Quando aprovares, eu faço a correção e a redistribuição imediatamente.