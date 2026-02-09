

## Alterar Nome no Authenticator App

### Problema

Quando digitalizas o QR Code, o Microsoft Authenticator mostra o nome do dominio do projeto (ex: `senvia-portugal-crm.lovable.app`) como identificador. Isso acontece porque o Supabase usa o URL do projeto como "issuer" por defeito no TOTP.

### Solucao

Adicionar o parametro `issuer` na chamada `supabase.auth.mfa.enroll()` para personalizar o nome que aparece na app de autenticacao.

### Ficheiro a editar

**`src/components/auth/EnrollMFA.tsx`** - Adicionar `issuer: 'Senvia OS'` ao enroll:

```typescript
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Authenticator App',
  issuer: 'Senvia OS',
});
```

Assim, no Microsoft Authenticator vai aparecer **"Senvia OS"** em vez do dominio.

**Total: 1 ficheiro, 1 linha adicionada**

