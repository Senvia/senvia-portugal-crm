
Objetivo

Criar um export mensal Excel, exclusivo para a Perfect2Gether, baseado em Vendas e filtrado por Data de Adjudicação, com a estrutura exata do ficheiro que mostraram.

O que já existe no sistema

- Já existe infraestrutura de exportação em `src/lib/export.ts`, mas hoje está focada em leads, clientes e prospects.
- A página `Sales.tsx` ainda não tem um export mensal específico.
- Grande parte dos dados já existe em `sales`, `proposals`, `proposal_cpes`, `crm_clients`, `leads` e `sale_payments`.
- O campo “Canal de Angariação” pode vir do `source` da lead/cliente, como confirmou.
- Há uma lacuna importante: “Data de Aceitação da Proposta” ainda não existe como campo próprio.
- Há outra lacuna provável: nem todas as colunas do Excel existem hoje com nome/campo direto no CRM.

Como vamos tornar isto real e funcional

1. Criar um export dedicado da Perfect2Gether
- Adicionar um novo export “Mensal Perfect2Gether” no módulo de Vendas.
- Este export sai em Excel manual, com colunas fixas e na ordem exata pedida.
- Fica visível apenas para a organização Perfect2Gether.

2. Filtrar corretamente por mês usando Data de Adjudicação
- O utilizador escolhe mês/intervalo.
- O sistema exporta vendas com `activation_date` dentro desse período, porque confirmou que o ficheiro mensal é “por adjudicação”.

3. Montar um mapeamento estável para cada coluna
- Vamos criar uma função própria, separada do export genérico atual, para construir o ficheiro.
- Fontes previstas:
  - Mês / Trimestre: derivado da Data de Adjudicação
  - Consultor: comercial associado ao registo
  - nome cliente / NIPC: cliente
  - Produção Total / KWP / Valor da proposta / Margem Comercial / COMISSÃO: venda
  - Canal de Angariação: `source`
  - Modalidade Pagamento: método/estrutura de pagamento da venda
  - Data de Adjudicação: `activation_date`
  - A RECEBER: valor ainda pendente da comissão, com regra dedicada
  - Tipo de registro de oportunidade / Tipo: proposta/venda
  - Linha de Contrato, Consumo anual, Duração contrato, Consumo contratado, Data de Início, Data Fim de Contrato, Tarifa Final/Target, Margens, Número de Proposta: proposta + CPEs/energia

4. Resolver as colunas que hoje ainda não estão perfeitas
- Criar campo próprio para “Data de Aceitação da Proposta”.
- Rever onde guardar/ler:
  - Margem Target
  - Tarifa Final
  - Tarifa Target
  - Tipo de registo de oportunidade
  - Linha de Contrato: Local de Cons
  - Consumo contratado
  - TIR/WACC
- Onde já existir, usamos.
- Onde não existir, definimos novos campos e passamos a capturá-los no fluxo certo.

5. Garantir qualidade do ficheiro para uso real mensal
- Ordem de colunas fixa.
- Labels exatamente iguais ao ficheiro externo.
- Datas em formato consistente.
- Números com precisão controlada.
- Linhas repetidas bem tratadas quando houver vários CPEs/linhas técnicas numa mesma venda.
- Fallbacks claros quando algum dado antigo estiver vazio.

Decisões de desenho recomendadas

A. Export dedicado em vez de reaproveitar o export genérico
- Mais seguro, porque este ficheiro tem lógica própria da Perfect2Gether.
- Evita partir exports existentes de Leads/Clientes/Prospects.

B. Estrutura em 2 fases
Fase 1: export funcional com tudo o que já existe
- Botão no módulo Vendas
- Filtro mensal por adjudicação
- Excel com colunas fixas
- Mapeamento dos campos já disponíveis

Fase 2: completar dados em falta no CRM
- Novo campo “Data de Aceitação da Proposta”
- Novos campos técnicos se faltarem
- Ajustes nos modais de proposta/venda para o ficheiro sair sempre completo

Campos que precisam de validação funcional antes de implementar
- “COMISSÃO” e “A RECEBER”: pelas respostas, ambos ficaram como “comissão por pagar”. Se isso for mesmo intencional, ambas as colunas vão sair da mesma regra. Se não, convém diferenciá-las antes da implementação.
- Algumas colunas técnicas do exemplo parecem mais próximas de Energia/CPE do que de Vendas puras, então o export terá de combinar dados de venda + proposta + linhas técnicas associadas.

Ficheiros que eu alteraria

- `src/lib/export.ts`
  - novo mapper específico para o Excel mensal Perfect2Gether
- `src/pages/Sales.tsx`
  - novo botão de export + filtro mensal
- `src/hooks/useSales.ts`
  - expandir o select com os relacionamentos necessários para o export
- `src/types/sales.ts`
  - tipar os novos campos usados no ficheiro
- `src/types/proposals.ts`
  - incluir novos campos técnicos/aceitação se forem criados
- `src/components/proposals/CreateProposalModal.tsx`
- `src/components/proposals/EditProposalModal.tsx`
- `src/components/sales/CreateSaleModal.tsx`
- `src/components/sales/EditSaleModal.tsx`
  - apenas se precisarmos capturar os campos em falta no fluxo operacional

Mudanças de base de dados que provavelmente serão necessárias

- Adicionar `accepted_at` na proposta
- Possivelmente adicionar campos próprios para os elementos técnicos que ainda não existem de forma estruturada
- Manter tudo ligado à proposta/venda, sem quebrar dados antigos

Resultado final esperado

- A Perfect2Gether entra em Vendas
- escolhe o mês
- clica em “Exportar Perfect2Gether”
- descarrega um Excel com a estrutura exata pedida
- o ficheiro sai pronto para uso mensal, sem ajustes manuais fora do CRM

Plano de execução recomendado

1. Levantar mapa final coluna → origem do dado
2. Implementar export Excel dedicado no módulo Vendas
3. Adicionar filtro mensal por Data de Adjudicação
4. Criar “Data de Aceitação da Proposta”
5. Preencher/normalizar os restantes campos técnicos em proposta/venda
6. Validar com um ficheiro real da Perfect2Gether e ajustar a ordem/formatos
