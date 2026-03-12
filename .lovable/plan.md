

## Diagnóstico: Lead Eduardo atribuído ao Galdino (banido)

### O que aconteceu
O lead "Eduardo" (c709a3f5) foi atribuído ao **Galdino** pelo round-robin. O Galdino está **banido** no Auth (banned_until: 2126), mas a tabela `organization_members` ainda tem `is_active: true`. Isto aconteceu porque o ban foi feito **antes** da correção que sincroniza `is_active` com o estado de ban (implementada recentemente). O round-robin vê `is_active: true` e continua a atribuir leads ao Galdino.

### Plano de Correção (3 partes)

**1. Correção de dados imediata**
- Atualizar `organization_members.is_active = false` para o Galdino (user_id: `da8adc4d-cbb5-4b93-adbe-bed2707ca625`)
- Reatribuir o lead Eduardo ao próximo comercial ativo via round-robin

**2. Reatribuição automática ao desativar/eliminar membro** (`manage-team-member/index.ts`)
- Nos actions `toggle_status` (ban) e `delete_member`, após desativar o membro:
  - Buscar todos os leads atribuídos a esse membro na organização
  - Executar round-robin entre os membros ativos restantes (respeitando `exclude_admins_from_assignment`)
  - Atualizar `assigned_to` de cada lead para o novo comercial
  - Atualizar `round_robin_index` na organização

**3. Proteção extra no round-robin** (`submit-lead/index.ts` + `useLeads.ts` + `useConvertProspectToLead.ts`)
- Não é necessário alterar: o round-robin já filtra por `is_active = true`. Com a correção do ponto 1, o Galdino deixa de aparecer.

### Resultado
- Galdino deixa de receber leads imediatamente
- O lead Eduardo é reatribuído automaticamente
- Futuramente, ao desativar qualquer colaborador, os seus leads são redistribuídos automaticamente

