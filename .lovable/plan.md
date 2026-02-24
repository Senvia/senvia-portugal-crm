

## Otto: Tickets de Suporte via WhatsApp

### O que vai acontecer

Quando um utilizador escrever ao Otto a pedir suporte (ex: "tenho um problema com X", "preciso de ajuda"), o Otto vai:
1. Recolher os detalhes do problema via conversa
2. Gravar o ticket na base de dados
3. Enviar uma mensagem WhatsApp automatica para ti com os detalhes do ticket

### Alteracoes

**1. Nova tabela `support_tickets`**

Guardar os tickets submetidos via Otto:
- `id`, `organization_id`, `user_id`
- `subject` (assunto curto)
- `description` (descricao completa)
- `status` (open, in_progress, resolved)
- `priority` (low, medium, high)
- `created_at`

RLS: Membros da organizacao podem criar e ver os seus tickets.

**2. Nova ferramenta no Otto: `submit_support_ticket`**

Adicionar ao `supabase/functions/otto-chat/index.ts`:

- Nova tool definition com parametros: `subject`, `description`, `priority`
- No executor da tool:
  1. Insere o ticket na tabela `support_tickets`
  2. Busca os dados do WhatsApp da organizacao Senvia Agency (hardcoded, pois os tickets vao sempre para ti)
  3. Envia mensagem via Evolution API com os dados do ticket
  4. Retorna confirmacao ao Otto

A mensagem WhatsApp tera este formato:

```text
-- NOVO TICKET DE SUPORTE --
Org: [nome da organizacao]
User: [nome do utilizador]
Assunto: [subject]
Descricao: [description]
Prioridade: [priority]
Data: [data/hora]
```

**3. Atualizar o System Prompt do Otto**

Adicionar instrucoes para o Otto saber quando usar a ferramenta:
- Quando o utilizador reportar um problema ou pedir suporte
- Deve recolher assunto e descricao antes de submeter
- Confirmar com o utilizador antes de enviar

**4. Numero de WhatsApp destino**

O numero de destino para onde os tickets serao enviados precisa de ser configurado. Opcoes:
- Usar um campo na tabela `organizations` (ex: `support_whatsapp_number`) para o numero do admin
- Ou hardcodar o teu numero pessoal na edge function

Sera usado o campo existente `whatsapp_number` da organizacao Senvia Agency, ou, caso prefiras, podes indicar o numero diretamente.

### Fluxo do utilizador

```text
User: "Tenho um problema com as faturas"
Otto: "Vou registar o teu pedido de suporte. Podes descrever o problema com mais detalhe?"
User: "As faturas nao estao a sincronizar com o InvoiceXpress"
Otto: "Vou submeter o ticket:
  - Assunto: Sincronizacao de faturas
  - Descricao: Faturas nao sincronizam com InvoiceXpress
  Confirmas o envio?"
  [botao:Sim, enviar][botao:Editar descricao]
User: "Sim, enviar"
Otto: (executa submit_support_ticket)
Otto: "Ticket #1234 criado com sucesso! A equipa de suporte foi notificada via WhatsApp e responderemos brevemente."
```

### Detalhes tecnicos

| Item | Detalhe |
|---|---|
| Tabela | `support_tickets` com RLS por org |
| Edge Function | Atualizar `otto-chat/index.ts` com nova tool |
| WhatsApp API | Evolution API via `https://zap.senvia.pt/` instancia `SenviaAgency` |
| Endpoint Evolution | `POST {base_url}/message/sendText/{instance}` com header `apikey` |
| Ficheiros alterados | `supabase/functions/otto-chat/index.ts`, migracao SQL |
| Numero destino | Precisa ser definido (o teu numero pessoal ou campo da org) |

### Pergunta antes de avancar

Preciso saber o numero de WhatsApp para onde os tickets devem ser enviados (formato internacional, ex: `351912345678`). Queres que use um numero fixo ou que busque da tabela organizations?

