

## Correção: Dados do Vendedor e Data no Email de Automação

### Problemas Encontrados

1. **Vendedor vazio**: Quando a automação dispara um email (ex: venda muda de estado), o sistema não envia o `clientId` para a função de envio. Sem isso, o vendedor atribuído ao cliente nunca é consultado — as variáveis `{{vendedor}}`, `{{vendedor_email}}` e `{{vendedor_telefone}}` ficam vazias.

2. **Data errada (03/03 em vez de 15/03)**: A variável `{{data}}` é preenchida com a data de HOJE (quando o email é enviado), não com a data de ativação da venda. O campo `activation_date` existe no registo mas não é mapeado para `{{data}}`.

### Correção

**Ficheiro:** `supabase/functions/process-automation/index.ts`

1. **Passar `clientId`**: Extrair `client_id` do record da venda e incluí-lo no recipient quando chama `send-template-email`, para que o vendedor seja resolvido automaticamente.

2. **Resolver data correta**: Para triggers de vendas, usar `activation_date` ou `sale_date` do record como `{{data}}` em vez de `new Date()`. Adicionar também variáveis explícitas como `{{data_ativacao}}` e `{{data_venda}}`.

3. **Resolver empresa**: Fazer lookup do cliente para obter `company` e `name` quando o record tem `client_id` mas não tem `email` direto, e adicionar `{{empresa}}` às variáveis.

### Mudanças concretas

```
process-automation/index.ts:
- Linha 97-106: Ao construir as variáveis, usar activation_date/sale_date do record para {{data}} em vez de new Date()
- Adicionar {{data_ativacao}} e {{data_venda}} formatadas em PT-PT
- Adicionar {{empresa}} do cliente resolvido
- Linha 129-133: Incluir clientId no recipient ao chamar send-template-email
```

Isto resolve ambos os problemas sem alterar o `send-template-email` (que já suporta `clientId` para o lookup do vendedor).

