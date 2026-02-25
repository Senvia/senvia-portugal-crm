

## Reformular Sistema de Tickets de Suporte do Otto

### Situação Atual

O Otto actualmente:
1. Recolhe dados do ticket passo-a-passo (assunto, descrição, contacto, anexos)
2. Insere o ticket na tabela `support_tickets` via backend
3. Envia notificação WhatsApp para o admin (351939135114) via Evolution API no backend

**Problema:** O sistema envia mensagem de suporte "de ti para ti" internamente. O utilizador quer que o ticket abra o WhatsApp do **cliente** para enviar a mensagem diretamente para o número do admin.

### Nova Abordagem

Em vez de enviar via Evolution API no backend:
1. O Otto continua a recolher os dados do ticket (assunto, descrição)
2. O Otto gera um **código de ticket simples** (ex: `SUP-0042`)
3. Em vez de chamar a Evolution API, o Otto monta a mensagem formatada e retorna um **link WhatsApp** (`wa.me/351939135114?text=...`) que o utilizador clica para enviar
4. O ticket é guardado na BD com o código simples

### Alterações

#### 1. Migration: Adicionar coluna `ticket_code` à tabela `support_tickets`

```sql
ALTER TABLE support_tickets ADD COLUMN ticket_code TEXT;

-- Função para gerar código sequencial por organização
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(ticket_code, 'SUP-', '') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM support_tickets
  WHERE organization_id = NEW.organization_id
  AND ticket_code IS NOT NULL;
  
  NEW.ticket_code := 'SUP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_code
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_code();
```

#### 2. Edge Function `otto-chat/index.ts` — Modificar `submit_support_ticket`

Remover toda a lógica de envio via Evolution API. Em vez disso:
- Inserir o ticket na BD (o trigger gera o código)
- Montar a mensagem WhatsApp formatada
- Retornar um `_instruction` que inclui um link WhatsApp clicável no formato `[whatsapp:Enviar via WhatsApp|URL]`

```typescript
case "submit_support_ticket": {
  // Insert ticket (trigger generates ticket_code)
  const { data: ticket, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({ ... })
    .select("id, ticket_code, created_at")
    .single();
  
  // Build WhatsApp message
  const msg = `🎫 *TICKET ${ticket.ticket_code}*\n\n*Assunto:* ${args.subject}\n*Descrição:* ${args.description}\n...`;
  const waUrl = `https://wa.me/351939135114?text=${encodeURIComponent(msg)}`;
  
  // Return with whatsapp link instead of sending via API
  return JSON.stringify({
    success: true,
    ticket_code: ticket.ticket_code,
    whatsapp_url: waUrl,
    _instruction: `Ticket ${ticket.ticket_code} criado! Mostra: "Ticket **${ticket.ticket_code}** registado. Clica no botão abaixo para enviar ao suporte via WhatsApp." [whatsapp:Enviar Ticket via WhatsApp|${waUrl}]`
  });
}
```

#### 3. `OttoMessage.tsx` — Adicionar parser para links WhatsApp

Adicionar um novo parser `parseWhatsAppLinks` que detecta `[whatsapp:Label|URL]` e renderiza um botão verde que abre `window.open(url, '_blank')`.

```tsx
function parseWhatsAppLinks(content: string) {
  const regex = /\[whatsapp:(.+?)\|(.+?)\]/g;
  const waLinks: { label: string; url: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    waLinks.push({ label: match[1], url: match[2] });
  }
  const cleanContent = content.replace(regex, "").trim();
  return { cleanContent, waLinks };
}
```

Renderizar com botão verde estilo WhatsApp:
```tsx
{waLinks.length > 0 && !isStreaming && (
  <div className="flex flex-wrap gap-1.5">
    {waLinks.map((wa, i) => (
      <Button
        key={i}
        size="sm"
        className="h-auto py-2 px-4 text-xs rounded-full bg-green-600 hover:bg-green-700 text-white gap-1.5"
        onClick={() => window.open(wa.url, '_blank')}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {wa.label}
      </Button>
    ))}
  </div>
)}
```

#### 4. Simplificar o fluxo no System Prompt

Actualizar o prompt do Otto para:
- Remover referência a "A equipa será notificada via WhatsApp"
- Adicionar no PASSO 5: "Após confirmação, cria o ticket e mostra o botão WhatsApp para o utilizador enviar directamente"
- Remover o PASSO 4 (anexos) — simplificar, já que o envio vai ser via WhatsApp do utilizador

### Ficheiros a Alterar

| Ficheiro | Alteração |
|---|---|
| Migration SQL | Adicionar `ticket_code` + trigger para gerar `SUP-XXXX` |
| `supabase/functions/otto-chat/index.ts` | Remover envio Evolution API, retornar link WhatsApp com código do ticket |
| `src/components/otto/OttoMessage.tsx` | Adicionar parser e renderização de botões WhatsApp (`[whatsapp:Label|URL]`) |

### Resultado Final

1. Otto recolhe assunto + descrição + contacto
2. Ticket é guardado na BD com código `SUP-0001`, `SUP-0002`, etc.
3. Otto mostra botão verde "Enviar Ticket via WhatsApp" que abre o WhatsApp do utilizador com a mensagem pré-formatada para o número 351939135114
4. O utilizador envia a mensagem ele próprio

