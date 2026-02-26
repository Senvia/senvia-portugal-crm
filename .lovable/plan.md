

## Estado Actual do Senvia OS — Análise de Prontidão

### O que ESTÁ a funcionar

| Área | Estado |
|---|---|
| **Autenticação** | Login, registo, trial 14 dias, bloqueio pós-trial |
| **Multi-tenant** | RLS, organizações separadas, selector de org |
| **Pipeline Telecom** | 5 etapas correctas (Lead → Ganha/Perdido) |
| **CRM (Leads)** | Kanban, formulários públicos, detalhes, anexos |
| **Clientes** | Tabela, detalhes, comunicações |
| **Calendário** | Eventos, alertas, views mês/semana/dia |
| **Propostas** | Criação, detalhes, envio por email |
| **Vendas** | Criação, estados, pagamentos, recorrência |
| **Financeiro** | Despesas, faturas, contas bancárias, pedidos internos |
| **Marketing** | Templates, campanhas Brevo, listas, automações |
| **E-commerce** | Produtos, pedidos, inventário, clientes |
| **Faturação Externa** | InvoiceXpress + KeyInvoice |
| **Planos/Billing** | 3 planos Stripe (49/99/147€), checkout, portal |
| **Otto (IA)** | Chatbot de suporte com tickets |
| **PWA** | Instalação mobile |
| **Formulários Públicos** | Captura de leads (/p/slug) |
| **Trial → Bloqueio → Cleanup** | Fluxo completo com retenção de 60 dias |
| **Billing exempt** | Senvia Agency e Perfect2Gether isentos |
| **Subscription plans DB** | Starter, Pro, Elite com feature flags |
| **Org de teste real** | "Construpao" (construction) em trial até 09/03 |

### Warnings menores (não bloqueiam venda)

- Warning de `forwardRef` no `LeadCard` e `App` — cosmético, não afecta funcionalidade
- Nenhum erro crítico na consola

### O que falta validar antes de vender

1. **Fluxo de registo end-to-end**: Um cliente novo regista-se → confirma email → entra no trial → vê o sistema → trial expira → faz checkout Stripe → acede ao plano pago. Este fluxo precisa de ser testado manualmente de ponta a ponta.

2. **Emails transacionais**: Confirmação de email no registo, notificações de lead — verificar que chegam (depende da configuração de email domain).

3. **WhatsApp (Evolution API)**: A integração está preparada nos campos da DB (`whatsapp_instance`, `whatsapp_api_key`, `whatsapp_base_url`) mas depende do n8n Master Workflow estar configurado externamente.

4. **Landing Page de venda**: O URL público `senvia-portugal-crm.lovable.app` mostra a página de login, não uma landing page de marketing. Para anúncios, precisas de uma landing page que explique o produto e leve ao registo.

### Recomendação

O **sistema core está funcional** e pronto para demonstração/beta. Para vender com anúncios, sugiro:
- Testar o fluxo completo de registo → trial → pagamento com uma conta de teste
- Criar uma landing page de venda (pode ser a rota `/` para visitantes não autenticados)
- Configurar o domínio de email para os transacionais

O sistema tem toda a infraestrutura. A questão não é "funciona?" — é "o fluxo do cliente está testado?".

