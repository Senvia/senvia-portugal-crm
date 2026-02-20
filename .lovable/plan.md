

## Reescrever o System Prompt do Otto - Novo Fluxo Obrigatorio

O system prompt atual do Otto e demasiado generico e nao segue o fluxo correto de clarificacao antes de resposta. Vamos substituir completamente o SYSTEM_PROMPT no ficheiro `supabase/functions/otto-chat/index.ts` com as novas instrucoes profissionais.

### O que muda

O Otto passa de um assistente "informal e amigavel" para um assistente **profissional, direto e eficiente** com um fluxo obrigatorio:

1. **Interpretar** a intencao do utilizador
2. **Clarificar** com 2-3 botoes antes de dar a resposta completa
3. **Instruir** com passos numerados e nomes exatos de menus
4. **Recusar educadamente** perguntas fora do ambito do Senvia OS

### Alteracoes Tecnicas

**Ficheiro:** `supabase/functions/otto-chat/index.ts`

Substituir o bloco `SYSTEM_PROMPT` (linhas 9-116) com o novo prompt que inclui:

- **Identidade**: Assistente tecnico de suporte interno (nao informal/amigavel)
- **Fluxo obrigatorio em 4 passos**: Interpretacao, Clarificacao com botoes, Instrucao passo-a-passo, Fronteira de conhecimento
- **Exemplo de interacao perfeita** embutido no prompt para o modelo seguir
- **Mapeamento completo dos 19 modulos** do Senvia OS:
  - Painel (Dashboard)
  - Leads e Pipeline
  - Clientes
  - Propostas
  - Vendas
  - Agenda (Calendario)
  - Financeiro (Pagamentos, Faturas, Despesas, Contas Bancarias, Pedidos Internos)
  - Marketing (Templates, Listas, Campanhas, Relatorios)
  - E-commerce (Produtos, Encomendas, Inventario, Clientes, Descontos)
  - Definicoes com todos os separadores: Geral, Pipeline, Formularios, Equipa, Produtos, Integracoes, Perfis, Modulos, Fiscal, Comissoes, Campos de Cliente, Alertas de Fidelizacao, Vendas
- **Integracoes detalhadas**: n8n/Webhook, WhatsApp (Evolution API), Brevo, InvoiceXpress, KeyInvoice
- **Faturacao**: dois fornecedores mutuamente exclusivos com instrucoes de configuracao
- **Regras de formatacao**: maximo 200 palavras, 2-4 botoes, markdown, sem emojis excessivos

### Resultado

O Otto vai:
- Nunca dar a resposta completa logo de imediato
- Sempre clarificar com botoes primeiro
- Dar instrucoes extremamente precisas com nomes exatos dos menus (ex: "Definicoes > Integracoes > Brevo")
- Recusar educadamente perguntas fora do Senvia OS
- Cobrir todos os 19 modulos do sistema com conhecimento atualizado

### Deploy

Apos a alteracao, o edge function `otto-chat` sera reimplantado automaticamente.
