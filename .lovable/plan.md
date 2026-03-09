

## Bug: Botão "Criar Lead" não faz nada

### Causa raiz

O problema está na validação do campo `gdpr_consent`. O schema Zod exige `z.literal(true)`, mas o valor default é `false`. Quando o utilizador clica "Criar Lead" sem marcar o checkbox RGPD, a validação falha silenciosamente porque o scroll automático para o erro não funciona -- o `Checkbox` do Radix não tem atributo `name="gdpr_consent"` no DOM, então `document.querySelector('[name="gdpr_consent"]')` retorna `null` e nada acontece.

O utilizador não vê nenhum feedback de que falta marcar o checkbox.

### Correção

**Ficheiro: `src/components/leads/AddLeadModal.tsx`**

1. **Melhorar o error handler do onClick** para usar um fallback quando `querySelector` não encontra o elemento -- fazer scroll até o `.text-destructive` (mensagem de erro) ou até o final do formulário onde está o checkbox RGPD
2. **Adicionar um toast de aviso** quando há erros de validação, para que o utilizador saiba que algo está errado mesmo que o scroll falhe
3. **Garantir que o FormMessage do RGPD é visível** -- mover o `<FormMessage />` para fora do flex row para que apareça claramente abaixo do checkbox

### Alterações concretas

```typescript
// No onClick do botão "Criar Lead" (~linha 742)
onClick={() => {
  form.handleSubmit(onSubmit, (errors) => {
    // Tentar scroll ao primeiro campo com erro
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const el = document.querySelector(`[name="${firstErrorKey}"]`) 
        || document.getElementById(`${firstErrorKey}-form-item`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // Mostrar toast com o primeiro erro
    const firstError = Object.values(errors)[0];
    toast({
      title: 'Campos obrigatórios',
      description: firstError?.message || 'Preencha todos os campos obrigatórios.',
      variant: 'destructive',
    });
  })();
}}
```

E mover o `<FormMessage />` do RGPD para fora do `flex` container para ser visível.

### Impacto
- O utilizador vê um toast claro quando a validação falha
- O checkbox RGPD mostra a mensagem de erro por baixo
- Zero risco de quebrar funcionalidade existente

