

## Adicionar suporte para tecla "Enter" no ecrã de MFA

### Problema

O componente `ChallengeMFA` não tem um elemento `<form>` a envolver o input OTP e o botão "Verificar". Sem `<form>`, carregar "Enter" não faz nada.

### Solucao

Envolver o conteudo do `CardContent` num `<form>` com `onSubmit` que chama `handleVerify` e previne o comportamento padrao do browser.

### Detalhes tecnicos

**Ficheiro: `src/components/auth/ChallengeMFA.tsx`**

- Envolver o bloco dentro de `<CardContent>` (linhas 82-123) com `<form onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>` 
- O botao "Verificar" passa a ter `type="submit"` em vez de `onClick`
- O botao "Terminar sessao" mantem `type="button"` para nao disparar o submit

### Resultado

Ao preencher os 6 digitos e carregar Enter, o codigo e verificado automaticamente -- comportamento esperado pelo utilizador.

| Ficheiro | Alteracao |
|---|---|
| `src/components/auth/ChallengeMFA.tsx` | Envolver conteudo em `<form>`, alterar botao para `type="submit"` |

