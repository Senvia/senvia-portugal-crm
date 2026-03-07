

## Botao "Enviar Email de Acesso" para membros existentes

### Problema
O botao de enviar email so aparece no momento da criacao do membro. Depois de fechar o modal, nao ha forma de reenviar credenciais.

### Solucao
Adicionar uma opcao "Enviar Email de Acesso" no dropdown de acoes de cada membro da equipa. O fluxo sera:

1. Admin clica em "Enviar Email de Acesso" no dropdown do membro
2. Abre um modal pedindo uma **nova password temporaria** (obrigatorio, pois nao temos a password original guardada)
3. O sistema:
   - Redefine a password do utilizador via edge function `manage-team-member` (action: `change_password`)
   - Envia o email via edge function `send-access-email` com as novas credenciais
4. Toast de sucesso

### Alteracoes

**Ficheiro: `src/components/settings/TeamTab.tsx`**
- Adicionar estado para o modal "Enviar Email de Acesso" (`sendAccessOpen`, `accessPassword`, etc.)
- Adicionar `DropdownMenuItem` com icone `Mail` e texto "Enviar Email de Acesso" no menu de cada membro
- Criar modal com campo de password temporaria + botao enviar
- Handler que: (1) redefine password, (2) invoca `send-access-email` com os dados do membro + slug da org

Nenhuma alteracao de backend necessaria — ambas as edge functions (`manage-team-member` e `send-access-email`) ja existem.

