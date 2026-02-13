
# Corrigir Registos de Envio de Campanhas

## Problema Encontrado

Os emails estao a ser enviados correctamente (128 de 129 foram enviados), mas os **registos nao ficam guardados na base de dados**. Isto acontece porque:

1. Quando se usam contactos de **Listas de Marketing**, o sistema passa o `id` do contacto de marketing como `client_id`
2. A tabela `email_sends` tem uma **foreign key** (`email_sends_client_id_fkey`) que exige que o `client_id` exista na tabela `clients`
3. Como os IDs de marketing nao existem na tabela `clients`, o INSERT falha silenciosamente para todos os 129 registos
4. Resultado: a campanha mostra "Sem dados de envio" e 0 em todas as metricas

## Solucao

Duas correcoes necessarias:

### 1. Edge Function (`supabase/functions/send-template-email/index.ts`)
- Quando o INSERT do `email_sends` falha (por exemplo, por causa do FK constraint), tentar novamente **sem o `client_id`** (colocando `null`)
- Isto garante que mesmo contactos de listas de marketing ficam registados
- Alternativa mais limpa: validar se o `client_id` existe na tabela `clients` antes de o usar

### 2. Frontend (`src/components/marketing/CreateCampaignModal.tsx`)
- Quando os contactos vem de listas de marketing (linha 575), nao enviar o `id` do marketing_contact como `clientId`
- Em vez disso, enviar `clientId: undefined` para contactos que nao sao clientes CRM
- Assim o edge function nem tenta inserir um FK invalido

## Ficheiros a editar

1. **`src/components/marketing/CreateCampaignModal.tsx`** - Nao passar `clientId` quando o contacto vem de uma lista de marketing (o `id` e de `marketing_contacts`, nao de `clients`)

2. **`supabase/functions/send-template-email/index.ts`** - Adicionar fallback: se o INSERT falhar, tentar novamente com `client_id: null` para garantir que o registo e sempre guardado

## Resultado Esperado

- Todos os envios ficam registados na tabela `email_sends` com o `campaign_id` correcto
- O modal de detalhes da campanha mostra todos os destinatarios e os seus estados
- As metricas (Enviados, Erros, etc.) aparecem correctamente
- Contactos CRM continuam a ter o `client_id` associado; contactos de listas aparecem sem `client_id`
