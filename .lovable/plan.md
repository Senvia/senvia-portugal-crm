

## Corrigir Visibilidade dos Digitos no Input OTP

### Problema

Os numeros digitados no campo de verificacao 2FA nao sao visiveis. O componente `InputOTPSlot` nao tem cor de texto nem cor de fundo explicitas, o que faz com que os caracteres fiquem invisiveis no dark mode.

### Solucao

Editar `src/components/ui/input-otp.tsx` para adicionar classes de cor ao `InputOTPSlot`:

- `text-foreground` - garante que os digitos sao visiveis
- `bg-background` - garante fundo solido nos slots

### Ficheiro a editar

**`src/components/ui/input-otp.tsx`** - Linha 35, adicionar classes ao slot:

De:
```
"relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md"
```

Para:
```
"relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm text-foreground bg-background transition-all first:rounded-l-md first:border-l last:rounded-r-md"
```

**Total: 1 ficheiro, 1 linha alterada**

