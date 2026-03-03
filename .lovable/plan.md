

## Adicionar edição de dados dos membros da equipa (Acessos)

Atualmente, na tabela de Acessos, só é possível: redefinir password, alterar perfil e ativar/desativar. Faltam ações para editar o nome, email e telefone de cada membro.

### Alterações

**1. Edge Function `manage-team-member`** — Adicionar nova action `update_profile`:
- Recebe `user_id`, `full_name`, `email`, `phone`
- Usa `supabaseAdmin` para atualizar a tabela `profiles` do membro alvo (validando que pertence à mesma organização)

**2. `src/components/settings/TeamTab.tsx`** — Adicionar modal "Editar Dados":
- Nova opção no DropdownMenu: "Editar Dados" com ícone de edição
- Modal com campos: Nome Completo, Email de contacto, Telefone
- Pré-preenche com os dados atuais do membro
- Chama a edge function `manage-team-member` com `action: 'update_profile'`

**3. `src/hooks/useTeam.ts`** — Verificar que o `TeamMember` já inclui `email` e `phone` do profile (se não, adicionar ao SELECT da query)

**4. Tabela de membros** — Mostrar email e telefone como info secundária na coluna "Nome" (texto mais pequeno abaixo do nome)

### Resultado
- Admin pode editar nome, email e telefone de qualquer membro da equipa diretamente nos Acessos
- Os dados editados ficam na tabela `profiles` e são usados nas variáveis de email `{{vendedor_email}}` e `{{vendedor_telefone}}`

