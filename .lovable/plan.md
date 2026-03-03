

## Corrigir erro "Cannot read properties of undefined (reading 'title')"

O problema é simples: no `onSuccess` do `useManageTeamMember` em `src/hooks/useProfile.ts`, o objeto `messages` não tem entrada para `update_profile`. Quando a action é `update_profile`, `msg` fica `undefined` e rebenta ao aceder `.title`.

### Correção

Adicionar a entrada `update_profile` ao objeto `messages`:

```typescript
const messages = {
  change_password: { title: 'Password redefinida', description: '...' },
  change_role: { title: 'Perfil alterado', description: '...' },
  toggle_status: { title: 'Estado alterado', description: '...' },
  update_profile: { title: 'Dados atualizados', description: 'Os dados do colaborador foram atualizados com sucesso.' },
};
```

Ficheiro: `src/hooks/useProfile.ts`, uma linha a adicionar.

