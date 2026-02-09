

## Autenticacao Duplo Fator (2FA/MFA) com TOTP

Implementar autenticacao de dois fatores usando TOTP (Time-based One-Time Password), compativel com Microsoft Authenticator, Google Authenticator, Authy, e qualquer app TOTP.

---

### Como Funciona

```text
REGISTO DO 2FA (uma vez):
  Utilizador → Definicoes → Ativar 2FA → QR Code aparece
  → Digitaliza com Microsoft Authenticator → Insere codigo → 2FA ativo

LOGIN COM 2FA (cada vez):
  Email + Password + Codigo Empresa → OK
  → Ecra de verificacao → Insere codigo de 6 digitos do Authenticator → Acesso
```

---

### Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/auth/EnrollMFA.tsx` | Componente para ativar 2FA (mostra QR Code + verificacao) |
| `src/components/auth/ChallengeMFA.tsx` | Ecra pos-login para inserir codigo TOTP |
| `src/components/settings/SecuritySettings.tsx` | Seccao nas Definicoes para gerir 2FA (ativar/desativar) |

### Ficheiros a Editar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Login.tsx` | Apos login com sucesso, verificar se o user tem MFA ativo e redirecionar para o ecra de challenge |
| `src/contexts/AuthContext.tsx` | Adicionar verificacao do nivel de autenticacao (aal1 vs aal2) |
| `src/components/auth/ProtectedRoute.tsx` | Verificar se o user tem aal2 quando MFA esta ativo, senao redirecionar para challenge |
| `src/pages/Settings.tsx` | Adicionar tab/seccao "Seguranca" com opcao de ativar/desativar 2FA |

---

### Detalhes Tecnicos

#### 1. Ativar 2FA (EnrollMFA)

Usa a API `supabase.auth.mfa.enroll()` para gerar um QR Code TOTP:

```typescript
// Gerar QR Code
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Microsoft Authenticator'
});
// data.totp.qr_code = SVG do QR Code
// data.id = factorId

// Verificar apos digitalizar
const challenge = await supabase.auth.mfa.challenge({ factorId });
await supabase.auth.mfa.verify({
  factorId,
  challengeId: challenge.data.id,
  code: codigoDoUtilizador // 6 digitos
});
```

#### 2. Login com 2FA (ChallengeMFA)

Apos login normal (email + password), o sistema verifica se o user tem fatores MFA ativos:

```typescript
const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
// data.currentLevel = 'aal1' (sem MFA) ou 'aal2' (com MFA verificado)
// data.nextLevel = 'aal2' se MFA esta ativo mas ainda nao verificado

if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
  // Mostrar ecra de challenge - pedir codigo
}
```

#### 3. ProtectedRoute atualizado

Verificar o nivel de autenticacao antes de permitir acesso:

```typescript
// Se o user tem MFA ativo mas so esta em aal1, redirecionar para challenge
const assuranceLevel = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
if (assuranceLevel.data?.nextLevel === 'aal2' && 
    assuranceLevel.data?.currentLevel !== 'aal2') {
  return <ChallengeMFA />;
}
```

#### 4. Desativar 2FA

Nas definicoes, o user pode remover o fator:

```typescript
const { data } = await supabase.auth.mfa.listFactors();
await supabase.auth.mfa.unenroll({ factorId: data.totp[0].id });
```

---

### Interface do Utilizador

#### Ecra de Ativacao (Definicoes)

```text
┌─────────────────────────────────────────────────┐
│ Seguranca                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ Autenticacao de Dois Fatores (2FA)              │
│ Estado: Desativado                              │
│                                                 │
│ [Ativar 2FA]                                    │
│                                                 │
│ ── Apos clicar ──                               │
│                                                 │
│ 1. Abra o Microsoft Authenticator               │
│ 2. Digitalize este QR Code:                     │
│                                                 │
│    ┌─────────────┐                              │
│    │  [QR CODE]  │                              │
│    └─────────────┘                              │
│                                                 │
│ 3. Insira o codigo de 6 digitos:                │
│    [______]                                     │
│                                                 │
│    [Cancelar]  [Confirmar]                      │
└─────────────────────────────────────────────────┘
```

#### Ecra de Challenge (Login)

```text
┌─────────────────────────────────────────────────┐
│           [Logo SENVIA]                         │
│                                                 │
│     Verificacao de Dois Fatores                 │
│                                                 │
│  Abra o Microsoft Authenticator e               │
│  insira o codigo de 6 digitos                   │
│                                                 │
│         [_] [_] [_] [_] [_] [_]                 │
│                                                 │
│              [Verificar]                        │
│                                                 │
│         Nao consegue aceder?                    │
│         Contacte o administrador                │
└─────────────────────────────────────────────────┘
```

---

### Compatibilidade

O TOTP e um padrao aberto (RFC 6238), funciona com:
- Microsoft Authenticator
- Google Authenticator
- Authy
- 1Password
- Bitwarden
- Qualquer app TOTP

---

### Resumo

| Acao | Ficheiro |
|------|----------|
| Criar | `src/components/auth/EnrollMFA.tsx` |
| Criar | `src/components/auth/ChallengeMFA.tsx` |
| Criar | `src/components/settings/SecuritySettings.tsx` |
| Editar | `src/pages/Login.tsx` |
| Editar | `src/contexts/AuthContext.tsx` |
| Editar | `src/components/auth/ProtectedRoute.tsx` |
| Editar | `src/pages/Settings.tsx` |

**Total: 3 ficheiros novos, 4 editados, 0 migracoes SQL**

Nao e necessaria nenhuma alteracao na base de dados - o MFA e gerido internamente pelo sistema de autenticacao do Lovable Cloud.

