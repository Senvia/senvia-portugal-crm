# Vendas Recorrentes e Stripe por Organização

**Data:** 12 de agosto de 2026
**Estado:** desenho aprovado pelo utilizador

## Objetivo

Disponibilizar vendas recorrentes fiáveis para qualquer organização, com ou sem cobrança Stripe, separando o estado do serviço do estado financeiro. Cada renovação deve originar exatamente um ciclo financeiro; um pagamento Stripe liquida esse ciclo e uma falha mantém o ciclo por liquidar sem desativar automaticamente o serviço.

## Problemas confirmados na auditoria

- As renovações manuais dependem do botão `Renovar Agora`; não existe geração automática dos ciclos de venda.
- A venda acumula pagamentos de vários meses e compara-os com o valor inicial, produzindo totais e percentagens incorretos.
- O estado `recurring_status = active` não garante que exista uma próxima renovação nem um lançamento financeiro do mês.
- O Stripe atual representa a subscrição do próprio Senvia e está acoplado à organização da agência.
- O webhook associa faturas por e-mail/organização e escolhe a primeira venda, sem uma ligação inequívoca entre subscrição e venda.
- O esquema não guarda os identificadores Stripe de produto, preço, cliente ou subscrição para vendas das organizações.
- O financeiro filtra pelo dia do pagamento, mesmo quando esse pagamento cobre outro período.
- Nos dados de produção existem recorrências vencidas sem ciclo, recorrências ativas sem próxima data e ciclos sobrepostos.

## Princípios do desenho

1. `sales` representa o contrato comercial e o seu valor inicial.
2. A recorrência é uma entidade própria, com periodicidade, valor e estado de serviço.
3. Cada período de cobrança é um ciclo financeiro próprio e imutável depois de liquidado.
4. O estado do serviço e o estado da cobrança são independentes.
5. Stripe é um motor de cobrança opcional, não a fonte exclusiva do domínio de vendas.
6. Toda associação Stripe usa identificadores e metadata estáveis; nunca e-mail, nome ou ordem de criação.
7. Webhooks, crons e reconciliações são idempotentes e toleram repetição e chegada fora de ordem.

## Modelo de dados

### `stripe_connections`

Uma ligação oficial Stripe Connect por organização.

Campos principais:

- `organization_id`: único por organização.
- `stripe_account_id`: identificador `acct_...` da conta ligada.
- `mode`: `test` ou `live`.
- `status`: `active`, `restricted`, `disconnected` ou `error`.
- `charges_enabled` e `details_submitted`: estado operacional devolvido pelo Stripe.
- `connected_at`, `disconnected_at` e `last_error`.

Segredos e tokens permanecem exclusivamente no servidor/Vault. A aplicação cliente recebe apenas estado, identificação mascarada e capacidades.

A ligação usa Stripe Connect OAuth para uma conta Standard já existente, com `scope=read_write`. Cada organização mantém uma única ligação ativa no modo escolhido; trocar entre teste e produção exige desligar a ligação atual e concluir novamente o consentimento, evitando misturar objetos dos dois ambientes.

### `stripe_product_mappings`

Liga cada produto recorrente do CRM ao produto e preço da conta Stripe da respetiva organização.

Campos principais:

- `organization_id`, `product_id` e `stripe_connection_id`.
- `stripe_product_id` e `stripe_price_id`.
- `currency`, `unit_amount`, `interval` e `interval_count`.
- `active`, `synced_at` e `sync_error`.

Nome, descrição e disponibilidade atualizam o Product Stripe. Como o valor de um Price Stripe é imutável, alterar o preço cria um novo Price e desativa o antigo para novas vendas. Subscrições existentes mudam para o novo preço na renovação seguinte, sem proração.

### `sale_recurrences`

Representa a obrigação recorrente e o estado operacional do serviço.

Campos principais:

- `sale_id` e `organization_id`.
- `amount`, `currency`, `interval`, `interval_count` e `anchor_date`.
- `service_status`: `pending`, `active`, `paused`, `inactive` ou `cancelled`.
- `billing_status`: `not_started`, `current`, `past_due` ou `uncollectible`.
- `billing_provider`: `manual` ou `stripe`.
- `next_cycle_date`, `last_cycle_date`, `paused_at`, `inactive_at` e `cancelled_at`.
- `stripe_customer_id`, `stripe_subscription_id` e `stripe_checkout_session_id` quando aplicável.

Uma venda tem no máximo uma recorrência ativa nesta primeira versão. A recorrência pode agregar vários itens da venda; o valor é o total recorrente contratado.

### `sale_recurring_cycles`

Representa uma mensalidade ou outro período já devido.

Campos principais:

- `recurrence_id`, `sale_id` e `organization_id`.
- `period_start`, `period_end`, `due_date`, `amount` e `currency`.
- `status`: `pending`, `paid`, `failed` ou `void`.
- `stripe_invoice_id`, `stripe_invoice_status`, `paid_at` e `failure_reason`.
- `created_at` e `updated_at`.

Existe uma restrição única em `(recurrence_id, period_start, period_end)`. Uma fatura Stripe não nula também é única. Isso garante exatamente um ciclo por período, mesmo com crons ou webhooks repetidos.

### `sale_payments`

Continua a ser o livro de movimentos recebidos ou previstos, mas ganha `recurring_cycle_id`. Para um ciclo manual, o lançamento nasce `pending`; ao ser liquidado, o mesmo registo passa a `paid`. Para Stripe, o ciclo é criado a partir da fatura e o pagamento recebido cria ou atualiza de forma idempotente o movimento ligado ao ciclo.

O valor recebido guarda o montante bruto pago pelo cliente. Os campos `stripe_gross_amount`, `stripe_fee_amount` e `stripe_net_amount` separam a reconciliação Stripe, porque subtrair taxas do recebimento faz uma fatura de 54 € parecer parcialmente paga. O fluxo de caixa pode mostrar líquido, mas a liquidação da dívida usa sempre o bruto.

### `stripe_events`

Livro técnico de eventos Stripe processados:

- `stripe_event_id` único.
- `stripe_account_id`, `organization_id`, `event_type` e `livemode`.
- `status`: `processing`, `processed`, `failed` ou `ignored`.
- `attempts`, `last_error`, `received_at` e `processed_at`.

O payload completo não é exposto ao cliente e é retido apenas quando necessário para diagnóstico seguro.

## Estados e transições

### Serviço

- `pending`: Checkout ainda não concluído ou recorrência ainda não iniciada.
- `active`: gera ciclos normalmente e aparece nas consultas de serviços ativos.
- `paused`: interrompe temporariamente novos ciclos e cobranças; pode voltar a `active`.
- `inactive`: deixa de aparecer como serviço ativo e encerra a cobrança no fim do período atual.
- `cancelled`: encerramento definitivo; não gera novos ciclos.

Uma cobrança falhada nunca altera automaticamente `service_status`.

### Cobrança

- `not_started`: ainda não existe ciclo cobrado.
- `current`: não existem ciclos vencidos por liquidar.
- `past_due`: existe pelo menos um ciclo vencido por liquidar ou falhado.
- `uncollectible`: a organização marcou explicitamente a dívida como incobrável.

### Ciclo

- `pending`: valor devido e ainda por liquidar.
- `paid`: pagamento recebido.
- `failed`: tentativa Stripe falhada; permanece contabilizado como por liquidar.
- `void`: ciclo anulado explicitamente e excluído dos valores devidos.

## Fluxo Stripe Connect

1. Um administrador abre Definições → Integrações e escolhe `Conectar com Stripe`.
2. O servidor gera o fluxo Stripe Connect OAuth Standard com `scope=read_write` para ligar a conta existente da organização, usando `state` assinado, uso único e expiração curta.
3. O callback valida sessão, organização, `state` e modo antes de guardar `stripe_account_id` e o estado operacional.
4. As chamadas destinadas à organização usam o contexto da conta ligada.
5. Eventos de contas ligadas chegam por um endpoint Connect, têm assinatura validada e são encaminhados pelo `event.account`.
6. Ao desligar, novos sincronismos e Checkouts são bloqueados; vendas e histórico do CRM são preservados.

## Fluxo de produto

1. A opção `Sincronizar com Stripe` só fica disponível para produtos recorrentes e organizações com ligação Stripe ativa.
2. Ao ativar, o servidor cria Product e Price mensal na conta ligada, com metadata que inclui `organization_id` e `product_id`.
3. A alteração de nome, descrição ou disponibilidade atualiza o Product Stripe.
4. A alteração de preço cria um novo Price e marca o mapeamento atual.
5. Subscrições existentes recebem o novo Price com proração desativada e efeito no próximo ciclo.
6. Erros ficam visíveis no produto e podem ser repetidos; o CRM nunca considera sincronizado um recurso que falhou.

## Fluxo de nova venda recorrente

### Manual

1. A venda é criada com produtos recorrentes, data âncora e estado de serviço `active`.
2. A recorrência é criada no servidor na mesma operação lógica.
3. O gerador diário cria o primeiro ciclo quando a data chegar.
4. O ciclo aparece no financeiro como `por liquidar` até ser liquidado manualmente.

### Stripe

1. O utilizador ativa `Cobrar com Stripe` numa venda composta apenas por itens recorrentes já sincronizados, ou escolhe quais itens recorrentes entram na subscrição.
2. O servidor cria a recorrência em `pending`, resolve/cria o Customer da venda e cria uma Checkout Session em modo `subscription`.
3. A metadata de Customer, Subscription, Checkout e Invoice contém `organization_id`, `sale_id` e `recurrence_id`.
4. A interface apresenta um link copiável para enviar ao cliente.
5. Um link expirado pode ser regenerado; a recorrência continua a mesma e não cria outra venda.
6. `checkout.session.completed` liga a subscrição e o cliente à recorrência.
7. `invoice.paid` cria/localiza o ciclo e liquida-o. O primeiro pagamento passa o serviço para `active` e a cobrança para `current`.

## Renovação e financeiro

Um processo diário chama uma função transacional que avança recorrências manuais e garante ciclos ausentes. O cálculo parte sempre da data âncora/último período, nunca de `now + 1 mês`, para não deslocar o dia em execuções tardias ou em meses curtos.

Para Stripe, `invoice.created` ou `invoice.finalized` materializa o ciclo por liquidar assim que a fatura existe. `invoice.paid` liquida esse mesmo ciclo. `invoice.payment_failed` mantém o montante devido, altera o ciclo para `failed` e a cobrança para `past_due`, sem desativar o serviço.

Uma reconciliação diária por conta ligada consulta faturas recentes e corrige eventos perdidos. As mesmas restrições únicas usadas pelos webhooks impedem duplicações.

As métricas passam a ter semânticas distintas:

- **Valor inicial da venda:** `sales.total_value`, mostrado uma vez.
- **Faturado no período:** ciclos cujo período começa no intervalo selecionado, incluindo pendentes e pagos.
- **Por liquidar:** ciclos `pending` ou `failed` ainda não pagos.
- **Recebido:** pagamentos `paid` pela data real de recebimento.
- **Líquido Stripe:** recebimento bruto menos taxas, mostrado como fluxo de caixa, não como dívida paga.

O filtro financeiro pode usar `Mês faturado` ou `Data de recebimento`. Um pagamento pode apresentar “Cobre agosto; recebido em 30 de julho”.

## Interface

### Detalhes da venda

- Valor inicial separado da mensalidade.
- Estado do serviço e estado da cobrança em indicadores distintos.
- Ciclo atual com período, valor, vencimento e estado.
- Próxima renovação e histórico agrupado por ciclo.
- Total histórico recebido sem o transformar em percentagem do valor inicial.
- Estado da ligação/sincronização Stripe e link Checkout quando aplicável.
- Ações `Pausar`, `Reativar`, `Tornar inativa` e `Cancelar` com confirmação e explicação do efeito.

### Lista de vendas

Filtros por:

- serviço ativo, pausado, inativo ou cancelado;
- cobrança em dia ou em atraso;
- produto/serviço;
- cobrança manual ou Stripe.

Esses mesmos campos ficam consultáveis pelos agentes, permitindo selecionar todas as vendas ativas de “Tráfego Pago” independentemente de pagamentos em atraso.

### Definições

- Cartão Stripe em Integrações com ação de ligar/desligar, modo, conta e saúde.
- Em Produtos & Serviços, opção de produto recorrente e `Sincronizar com Stripe`, com estado e último erro.

## Migração e reparação histórica

A migração é conservadora e auditável:

1. Criar as novas tabelas, índices, políticas e funções sem remover os campos antigos.
2. Criar uma recorrência para cada venda existente com `has_recurring = true`.
3. Reconstruir ciclos a partir de `billing_period_start`, `billing_period_end`, `stripe_invoice_id`, data e notas.
4. Consultar Stripe quando necessário para recuperar Subscription, período e valor bruto reais.
5. Associar faturas usando IDs e metadata confirmados; casos ambíguos ficam num relatório, sem associação automática.
6. Corrigir `next_cycle_date` pela subscrição Stripe ou pela sequência de ciclos manuais.
7. Identificar sobreposições; preservar todos os pagamentos recebidos e marcar duplicações/lançamentos manuais para revisão em vez de apagar dinheiro.
8. Manter uma vista de compatibilidade durante a transição e retirar a lógica antiga somente quando todos os consumidores usarem as novas entidades.

A venda `0009` da organização Senvia é uma validação obrigatória. O resultado esperado é:

- venda inicial de 49 € apresentada separadamente;
- mensalidade atual de 54 €;
- quatro recebimentos históricos associados aos ciclos corretos;
- agosto de 2026 visível como ciclo próprio, liquidado apenas se existir fatura paga correspondente;
- nenhuma percentagem de pagamento calculada pela soma histórica sobre 49 €;
- taxas Stripe mostradas separadamente do valor bruto que liquidou a fatura.

## Segurança e isolamento

- Todas as mutações Stripe são feitas em funções servidoras autenticadas.
- Credenciais, tokens e segredos de webhook nunca entram em tabelas ou vistas acessíveis ao cliente.
- O callback Stripe valida `state`, utilizador, organização, expiração e uso único.
- Webhooks validam a assinatura sobre o corpo bruto antes de interpretar JSON.
- `event.account` determina a ligação; metadata confirma venda e recorrência dentro da mesma organização.
- RLS aplica isolamento por `organization_id`; funções `SECURITY DEFINER` fixam `search_path`, validam pertença e revogam execução pública quando não necessária.
- IDs Stripe e restrições únicas protegem contra repetição e concorrência.
- Logs não contêm segredos, dados de cartão nem payloads completos com dados pessoais.

## Tratamento de falhas

- Sincronismo de produto falhado mantém o produto utilizável no CRM, mas bloqueia novas vendas Stripe até ser corrigido.
- Checkout falhado mantém a recorrência `pending` e permite repetir.
- Webhook falhado responde com erro para receber nova tentativa e grava contexto técnico seguro.
- Eventos fora de ordem consultam o estado atual da Invoice/Subscription antes de regredir estados.
- Reconciliação diária recupera webhooks perdidos e sinaliza faturas sem ligação válida.
- Pausar/inativar/cancelar é refletido no Stripe; uma falha remota não confirma a transição local como concluída.

## Testes e critérios de aceitação

### Domínio e base de dados

- Gerar o mesmo período duas vezes produz um único ciclo.
- Datas âncora em 29, 30 e 31 avançam corretamente por meses curtos.
- Um ciclo falhado continua por liquidar e não altera o serviço ativo.
- Pagamento bruto liquida a dívida; taxas não criam pagamento parcial.
- Pausa, reativação, inativação e cancelamento respeitam as transições definidas.
- RLS impede leitura ou alteração entre organizações.

### Stripe em modo de teste

- Ligar/desligar uma conta de teste.
- Criar e atualizar produto/preço na conta ligada.
- Gerar e regenerar Checkout.
- Primeiro pagamento ativa a recorrência.
- Renovação paga cria e liquida um único ciclo.
- Pagamento falhado mantém serviço ativo e ciclo por liquidar.
- Webhook repetido ou fora de ordem não duplica nem regride dados.
- Reconciliação recupera uma fatura deliberadamente não processada.

### Interface e financeiro

- Venda recorrente mostra valor inicial, mensalidade e histórico sem percentagem acumulada incorreta.
- Filtros de serviço, cobrança, produto e provedor devolvem as vendas corretas.
- Financeiro distingue mês faturado de data de recebimento.
- Desktop e móvel mantêm ações e estados legíveis.
- A venda `0009` satisfaz todos os resultados esperados da reparação histórica.

## Fora do âmbito desta entrega

- Recorrências com múltiplas moedas na mesma venda.
- Mais de uma recorrência ativa por venda.
- Proração imediata no meio do ciclo.
- Cobrança por consumo, escalões ou quantidade variável.
- Débito direto fora dos métodos suportados pelo Checkout Stripe da conta ligada.

Esses casos poderão usar as mesmas entidades numa evolução futura sem alterar a semântica dos ciclos atuais.
