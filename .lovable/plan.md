

## Corrigir Geração do QR Code MFA

### Problema

Ao clicar em "Ativar 2FA", o sistema tenta criar um fator com o nome "Authenticator App", mas já existe um fator com esse nome (de uma tentativa anterior que não foi completada). O servidor rejeita com erro `mfa_factor_name_conflict`.

### Solução

Alterar o `handleEnroll` no ficheiro `src/components/auth/EnrollMFA.tsx` para:

1. **Antes de criar um novo fator**, listar os fatores existentes com `supabase.auth.mfa.listFactors()`
2. **Remover fatores TOTP não verificados** (status `unverified`) usando `supabase.auth.mfa.unenroll()`
3. **Depois sim, criar o novo fator** normalmente

### Secao Tecnica

**Ficheiro a editar:** `src/components/auth/EnrollMFA.tsx`

Logica atualizada do `handleEnroll`:

```typescript
const handleEnroll = async () => {
  setIsEnrolling(true);
  try {
    // 1. Limpar fatores nao verificados
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const unverifiedFactors = factors?.totp?.filter(f => f.status === 'unverified') || [];
    for (const factor of unverifiedFactors) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    // 2. Criar novo fator
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });
    // ... resto igual
  }
};
```

**Total: 1 ficheiro editado, ~10 linhas adicionadas**
