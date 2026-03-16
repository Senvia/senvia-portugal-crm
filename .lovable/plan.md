
Objetivo: permitir templates de renovação com chaves dinâmicas da venda correta e criar 2 automações separadas para renovação no dia e 2 dias antes.

Plano
1. Expandir as chaves dos templates de email
- Vou adicionar novas variáveis específicas de venda/renovação no editor:
  - `{{codigo_venda}}`
  - `{{produto_servico}}`
  - `{{valor_recorrente}}`
  - `{{valor_pagamento}}`
  - `{{data_renovacao}}`
  - `{{dias_para_renovacao}}`
- Como não escolheste o tipo de valor, a solução mais segura é expor os dois:
  - `{{valor_recorrente}}` = mensalidade/valor recorrente da venda
  - `{{valor_pagamento}}` = valor do pagamento de renovação associado
- Assim consegues montar textos como:
  - “A mensalidade do serviço {{produto_servico}} vai renovar em {{data_renovacao}} no valor de {{valor_recorrente}}…”

2. Garantir que o email puxa a venda e serviço corretos
- Vou reforçar o backend de envio de templates para aceitar contexto de venda/renovação.
- Quando o envio vier de uma automação de renovação, o sistema vai carregar:
  - cliente da venda
  - código da venda
  - valor recorrente
  - próxima data de renovação
  - item/serviço recorrente principal
- Regra para `{{produto_servico}}`:
  - priorizar o serviço/produto recorrente associado à venda
  - se não houver item recorrente explícito, usar fallback dos campos já existentes da venda
- Isto evita enviar o serviço errado ao cliente errado.

3. Criar 2 novos gatilhos de automação
- Vou acrescentar novos gatilhos na gestão de templates:
  - `sale_renewal_due_today`
  - `sale_renewal_due_in_2_days`
- Estes gatilhos aparecem no modal de criação/edição de template e não precisam da configuração “de estado para estado”.

4. Criar rotina automática para disparar as renovações
- A arquitetura atual só reage a inserts/updates; para “vence hoje” e “vence em 2 dias” é preciso uma verificação agendada.
- Vou planear uma rotina backend que corre automaticamente e procura vendas recorrentes ativas com:
  - `next_renewal_date = hoje`
  - `next_renewal_date = hoje + 2 dias`
- Para cada venda elegível, essa rotina dispara o gatilho correspondente com os dados da venda.

5. Evitar envios duplicados
- Para não reenviar o mesmo email várias vezes no mesmo dia, vou adicionar um registo interno de processamento por:
  - venda
  - data de renovação
  - gatilho
- Assim cada renovação só dispara uma vez por momento (“2 dias antes” e “no dia”).

6. Atualizar a UI dos templates
- Vou mostrar as novas chaves no editor de templates, numa secção própria de “Venda / Renovação”.
- Isso facilita criar HTML com placeholders sem teres de adivinhar os nomes.

Resultado esperado
- Consegues criar templates HTML com placeholders de renovação reais.
- O sistema encontra automaticamente o cliente correto, a venda correta e o serviço recorrente correto.
- Ficas com 2 automações distintas:
  - aviso 2 dias antes
  - aviso no próprio dia
- Os emails deixam de depender de preenchimento manual do valor/serviço em cada envio.

Ficheiros/áreas principais a alterar
- `src/types/marketing.ts`
- `src/components/marketing/TemplateEditor.tsx`
- `src/hooks/useAutomations.ts`
- `src/components/marketing/TemplateAutomationSection.tsx`
- `supabase/functions/send-template-email/index.ts`
- `supabase/functions/process-automation/index.ts`
- nova rotina backend agendada para renovações
- pequena alteração de base de dados para registo anti-duplicação

Nota de desenho
- Recomendo implementar já ambas as chaves de valor (`{{valor_recorrente}}` e `{{valor_pagamento}}`) para não bloquear o teu caso e para dar flexibilidade a futuros templates de cobrança e aviso.
