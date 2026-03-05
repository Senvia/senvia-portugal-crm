

## Enviar Email a Leads com Templates de Boas-vindas

### Resumo

Adicionar um botao "Enviar Email" nos leads (tanto no LeadDetailsModal como no LeadCard) que abre um modal para selecionar um template de email (filtrado por categoria `welcome`) e enviar ao lead.

### Componente Novo

**`src/components/leads/SendLeadEmailModal.tsx`** — Modal dedicado para envio de email a um lead:
- Recebe o `lead` como prop (nome, email)
- Carrega templates via `useEmailTemplates()`, filtra por categoria `welcome` (boas-vindas) mas permite ver todos
- Lista os templates disponiveis com nome e assunto
- Ao selecionar um template, mostra preview do assunto e botao "Enviar"
- Usa `useSendTemplateEmail()` para enviar, passando o lead como unico destinatario com variaveis pre-preenchidas (`nome`, `email`, `telefone`, `empresa`)
- Feedback de sucesso/erro via toast

### Alteracoes

| Ficheiro | Alteracao |
|---|---|
| `src/components/leads/SendLeadEmailModal.tsx` | **Novo** — Modal de selecao de template e envio |
| `src/components/leads/LeadDetailsModal.tsx` | Adicionar botao "Enviar Email" na secao "Acoes Rapidas" (linhas 607-630), entre WhatsApp e Ligar. Abre o `SendLeadEmailModal`. Desabilitado se lead nao tem email |
| `src/components/leads/LeadCard.tsx` | Adicionar icone de email no grupo de botoes de acao (linhas 260-280), abre o mesmo modal |

### Fluxo

1. Utilizador clica "Enviar Email" no lead
2. Modal abre com lista de templates (boas-vindas em destaque, outros disponiveis)
3. Seleciona template → ve preview do assunto
4. Clica "Enviar" → edge function `send-template-email` processa o envio via Brevo
5. Toast de confirmacao

