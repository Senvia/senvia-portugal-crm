

## Atualizar Conhecimento do Otto

### Problema
O system prompt do Otto nao tem informacao sobre onde ficam os formularios no sistema. Ele esta a dizer ao utilizador para ir a Marketing, quando na verdade os formularios sao geridos em **Definicoes > Definicoes Gerais > Formularios**.

### Solucao
Atualizar o `SYSTEM_PROMPT` no ficheiro `supabase/functions/otto-chat/index.ts`:

**1. Adicionar rota no MAPA DE ROTAS** (apos linha 87):
```
- /settings (secção Formulários) → Definições > Definições Gerais > Formulários
```

**2. Adicionar secao de CONHECIMENTO DO SISTEMA** apos o mapa de rotas, com informacao precisa sobre onde encontrar cada funcionalidade:

```
CONHECIMENTO DO SISTEMA (onde fica cada funcionalidade):

FORMULÁRIOS DE CAPTURA DE LEADS:
- Os formulários públicos para captura de leads são geridos em: Definições > Definições Gerais > Formulários
- NÃO estão em Marketing. Marketing é para campanhas de email e templates.
- Cada formulário tem um link público (slug) que pode ser usado em landing pages e anúncios.
- Tipos: Formulário clássico ou Formulário conversacional (com IA).
- Configurações: campos personalizados, etapa do pipeline, atribuição automática, Meta Pixel, mensagem de sucesso.

PIPELINE DE LEADS:
- Configurar etapas do pipeline: Definições > Definições Gerais > Pipeline
- Gerir leads no Kanban: Leads (menu lateral)

EQUIPA E ACESSOS:
- Adicionar membros: Definições > Equipa e Acessos
- Perfis de permissão: Definições > Equipa e Acessos > Perfis

INTEGRAÇÕES:
- WhatsApp, Brevo (email), InvoiceXpress/KeyInvoice (faturação): Definições > Integrações

PRODUTOS:
- Catálogo de produtos/serviços: Definições > Produtos

NOTIFICAÇÕES:
- Push notifications, alertas de fidelização, alertas de agenda: Definições > Notificações

PLANO E FATURAÇÃO:
- Subscrição, upgrade, faturas: Definições > Plano e Faturação
```

### Resumo
1 ficheiro editado: `supabase/functions/otto-chat/index.ts` — adicionar mapa de funcionalidades ao system prompt para o Otto dar instrucoes corretas sobre formularios e outras areas do sistema. Requer redeploy da edge function.

