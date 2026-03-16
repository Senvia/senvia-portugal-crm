
Objetivo

Criar um módulo próprio de Prospects exclusivo da Perfect2Gether, capaz de:
- importar ficheiros como o `.xlsb` que enviaste,
- guardar os prospects numa área separada de Leads,
- distribuir em round-robin apenas para comerciais,
- converter essa distribuição diretamente em Leads,
- mostrar na tabela o comercial atribuído, quantos já foram atribuídos e quantos faltam,
- filtrar por comercial,
- exportar os dados.

O que confirmei no ficheiro
- Consigo ler o ficheiro.
- Ele tem estrutura boa para importação de prospeção, com colunas como:
  - `NIF`
  - `Nome da Empresa`
  - `Contato`
  - `Email`
  - `CPE`
  - `kWhAno`
  - `Observações`
- Ou seja: o ficheiro serve perfeitamente como base para um módulo de Prospects energético/comercial.

Decisão de arquitetura
- Vamos fazer um módulo próprio de Prospects, separado de Marketing/Listas.
- A base atual de marketing_contacts não é suficiente para o que queres, porque:
  - não tem `assigned_to`,
  - não tem campos específicos do teu ficheiro,
  - não foi pensada para distribuição operacional por comerciais,
  - a conversão atual para lead é mais simples e não suporta bem esse fluxo dedicado.

Implementação proposta

1. Criar a entidade de Prospects
- Nova tabela de prospects com campos pensados para esse ficheiro:
  - organização
  - nome da empresa
  - nome do contacto
  - email
  - telefone
  - NIF
  - CPE
  - segmento
  - estado
  - consumo anual / kWh
  - observações
  - assigned_to
  - assigned_at
  - converted_to_lead
  - converted_lead_id
  - source/import metadata
- RLS baseada em pertença ativa à organização.
- Visibilidade alinhada com a lógica já usada no CRM.

2. Criar o módulo “Prospects”
- Nova rota própria, por exemplo `/prospects`.
- Adicionar entrada no menu lateral e/ou na área principal da app.
- Ecrã principal com tabela de prospects.

3. Tabela de Prospects
- Colunas principais:
  - Empresa
  - Contacto
  - Email
  - Telefone
  - NIF
  - CPE
  - kWh/Ano
  - Estado
  - Comercial atribuído
  - Estado de conversão
- Filtros:
  - pesquisa
  - comercial
  - atribuídos / não atribuídos
  - convertidos / não convertidos
- Informação visível no topo:
  - quantidade total
  - quantidade atribuída
  - quantidade restante

4. Importação do ficheiro
- Reaproveitar o componente de upload existente como base.
- Adaptar o mapeamento para Prospects, incluindo campos do teu ficheiro.
- Suportar `.xlsb`, `.xlsx`, `.xls`, `.csv`, `.txt`.
- Fazer deduplicação prioritária por:
  - NIF + CPE
  - e fallback por email
- No final da importação, os registos entram como prospects ainda não distribuídos.

5. Distribuição round-robin
- Ação em massa “Distribuir prospects”.
- Escolher:
  - comerciais elegíveis,
  - quantidade a distribuir.
- Regra:
  - 1 lead para comercial 1,
  - seguinte para comercial 2,
  - e assim por diante,
  - apenas membros com perfil/função comercial.
- Não incluir admins/viewers.
- Distribuir só prospects ainda não convertidos.

6. Conversão para Leads no ato da distribuição
- Como escolheste “Converter em leads”, a distribuição fará:
  - atribuir o prospect a um comercial,
  - criar a lead correspondente,
  - marcar o prospect como convertido.
- A lead criada deve herdar os dados relevantes:
  - contacto
  - empresa
  - email
  - telefone
  - NIF
  - consumo anual
  - origem = prospect
  - assigned_to = comercial definido pelo round-robin

7. Informação do comercial na tela
- Na tabela de Prospects:
  - coluna “Comercial atribuído”
- No topo:
  - “Atribuídos”
  - “Restantes”
- Filtro por comercial
- Se necessário, badge “Não atribuído”.

8. Exportação
- Botões de exportar CSV/Excel no módulo.
- Exportar a lista filtrada ou selecionada.
- Incluir comercial atribuído e estado de conversão.

Ficheiros prováveis a mexer
- Frontend
  - `src/App.tsx`
  - novo `src/pages/Prospects.tsx`
  - novos componentes de prospects
  - possível reaproveitamento de `src/components/marketing/import/ImportStep1Upload.tsx`
  - `src/components/layout/AppSidebar.tsx`
  - `src/lib/export.ts`
- Hooks
  - novos hooks tipo `useProspects`, `useImportProspects`, `useDistributeProspects`
  - reaproveitar padrões de `useLeads`, `useBulkAssign`, `useTeam`
- Base de dados
  - nova tabela `prospects`
  - políticas RLS
  - possivelmente função/backend action para distribuição segura e conversão em lote

Regras de negócio que vou seguir
- Exclusivo da Perfect2Gether
- Só comerciais entram na distribuição
- Prospects ficam separados de Leads
- Distribuição converte diretamente em Leads
- Mostrar comercial atribuído + filtro por comercial + contadores de atribuídos/restantes

Notas técnicas importantes
- O ficheiro que enviaste contém muitos campos úteis para energia; vale a pena guardar esses campos próprios no módulo, em vez de “esmagar” tudo numa estrutura genérica.
- A forma mais segura para a distribuição é fazê-la centralmente no backend, para garantir:
  - round-robin correto,
  - consistência da conversão,
  - evitar duplicação,
  - evitar que dois utilizadores distribuam os mesmos prospects ao mesmo tempo.
- O módulo atual de Marketing/Listas pode continuar a existir, mas este novo fluxo deve viver isolado, porque o objetivo operacional é diferente.

Resultado esperado
- Importas o ficheiro de prospects.
- Vês os prospects numa tabela dedicada.
- Filtras por comercial.
- Sabes quantos já foram atribuídos e quantos faltam.
- Clicas em distribuir, defines quantidade, e o sistema reparte só pelos comerciais.
- Cada prospect distribuído é convertido automaticamente numa Lead atribuída ao comercial correspondente.
