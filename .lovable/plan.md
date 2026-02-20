

## Corrigir Conhecimento do Otto - Adicionar KeyInvoice

O system prompt do Otto menciona apenas o InvoiceXpress em 3 locais e ignora completamente o KeyInvoice. Vamos atualizar o conhecimento do Otto para refletir que o sistema suporta **dois fornecedores de faturacao** mutuamente exclusivos.

### Alteracoes no Ficheiro

**`supabase/functions/otto-chat/index.ts`** - Atualizar o SYSTEM_PROMPT em 3 secoes:

1. **Secao VENDAS (linha 55)**: Substituir "Faturas: emitir via InvoiceXpress (se configurado)" por texto que mencione ambos os fornecedores

2. **Secao FINANCEIRO (linha 66)**: Substituir "Faturas: sincronizacao com InvoiceXpress" por texto que inclua KeyInvoice como alternativa

3. **Secao CONFIGURACOES (linha 87)**: Substituir "Integrações: WhatsApp (Evolution API), InvoiceXpress, Brevo" por texto que liste tambem o KeyInvoice

4. **Adicionar nova secao FATURACAO** no system prompt com detalhes sobre:
   - InvoiceXpress: como configurar, o que faz (faturas, faturas-recibo, notas de credito)
   - KeyInvoice: como configurar (API 5.0), o que faz
   - Regra de exclusividade: apenas um fornecedor pode estar ativo de cada vez
   - Como alternar entre fornecedores: Definicoes -> Integracoes -> Faturacao
   - Configurar em: Definicoes -> Integracoes -> escolher InvoiceXpress ou KeyInvoice

### Conteudo Atualizado

| Secao | Antes | Depois |
|-------|-------|--------|
| Vendas | "Faturas: emitir via InvoiceXpress" | "Faturas: emitir via InvoiceXpress ou KeyInvoice (conforme o fornecedor configurado)" |
| Financeiro | "Faturas: sincronizacao com InvoiceXpress" | "Faturas: sincronizacao com InvoiceXpress ou KeyInvoice" |
| Configuracoes | "Integracoes: WhatsApp, InvoiceXpress, Brevo" | "Integracoes: WhatsApp (Evolution API), InvoiceXpress, KeyInvoice, Brevo" |
| Nova secao | (nao existia) | Detalhes sobre ambos os fornecedores e regra de exclusividade |

### Resultado

O Otto passara a responder corretamente que o Senvia OS suporta **InvoiceXpress e KeyInvoice** como fornecedores de faturacao, e sabera explicar as diferencas e como configurar cada um.
