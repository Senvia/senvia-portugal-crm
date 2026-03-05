

## Assinatura como Variável de Template `{{assinatura}}`

### Resumo

Substituir a concatenação automática da assinatura no final do email por uma variável `{{assinatura}}` que o utilizador posiciona livremente no template HTML. A assinatura é resolvida dinamicamente com base no utilizador que envia o email.

### Alterações

| Componente | O quê |
|---|---|
| **`src/types/marketing.ts`** | Adicionar `{ key: '{{assinatura}}', label: 'Assinatura do comercial' }` ao array `TEMPLATE_VARIABLES_ORG` |
| **`supabase/functions/send-template-email/index.ts`** | Remover a concatenação no final (`htmlContent + '<br><br>---<br>' + senderSignature`). Em vez disso, incluir `assinatura: senderSignature || ''` no objeto de variáveis passado ao `replaceVariables()`, para que `{{assinatura}}` seja substituído inline |

### Resultado

- No editor de templates, aparece o botão `{{assinatura}}` junto das outras variáveis da organização
- O utilizador coloca `{{assinatura}}` onde quiser no HTML do template
- Ao enviar, o sistema substitui `{{assinatura}}` pelo `email_signature` do perfil do utilizador autenticado
- Se o utilizador não tiver assinatura configurada, a variável é substituída por string vazia (sem vestígios)

