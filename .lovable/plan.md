

# Mover "Alterar Palavra-passe" para Seguranca

## O que muda

A seccao de alteracao de palavra-passe sai do separador **Geral** (dentro do card "A Minha Conta") e passa para o separador **Seguranca**, junto ao 2FA. Faz sentido logicamente -- password e 2FA sao ambos temas de seguranca.

## Alteracoes

### 1. `SecuritySettings.tsx` -- Receber props de password e renderizar a seccao

O componente passa a aceitar props para gerir a palavra-passe:

- `newPassword`, `setNewPassword`
- `confirmPassword`, `setConfirmPassword`
- `showPassword`, `setShowPassword`
- `handleChangePassword`
- `changePasswordIsPending`

Adicionar um segundo `Card` abaixo do card de 2FA com o formulario de alteracao de password (o mesmo layout que existe atualmente no `GeneralContent`).

### 2. `GeneralContent.tsx` -- Remover seccao de password

Remover:
- O `Separator` e todo o bloco "Alterar Palavra-passe" do card "A Minha Conta"
- As props relacionadas: `newPassword`, `setNewPassword`, `confirmPassword`, `setConfirmPassword`, `showPassword`, `setShowPassword`, `handleChangePassword`, `changePasswordIsPending`

### 3. `Settings.tsx` -- Passar as props de password ao SecuritySettings

Nas duas renderizacoes do `SecuritySettings` (mobile e desktop), passar as props de password que ja existem no estado do componente pai. Remover essas mesmas props das chamadas ao `GeneralContent`.

## Estrutura Final

```text
Separador GERAL:
  - Card Organizacao (nome, plano, slug)
  - Card A Minha Conta (nome completo -- sem password)
  - Card Notificacoes Push
  - Card GDPR

Separador SEGURANCA:
  - Card 2FA (existente)
  - Card Alterar Palavra-passe (movido)
```

## Detalhes Tecnicos

| Ficheiro | Acao |
|----------|------|
| `src/components/settings/SecuritySettings.tsx` | Adicionar props de password + novo Card com formulario |
| `src/components/settings/GeneralContent.tsx` | Remover seccao de password e props associadas |
| `src/pages/Settings.tsx` | Passar props de password ao SecuritySettings (mobile + desktop), remover do GeneralContent |

