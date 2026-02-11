
Objetivo
- Fazer a ordenação (setas) em /financeiro/pagamentos “lembrar” a última escolha do utilizador (campo + direção), mesmo depois de navegar para outra página e voltar.

Porque está a acontecer o reset
- Em `src/pages/finance/Payments.tsx`, `sortField` e `sortDirection` estão em `useState(...)` com defaults (`payment_date` + `desc`).
- Ao trocar de página, o componente desmonta e volta a montar, então os states voltam ao default.

Solução proposta (persistência em localStorage)
- Persistir `sortField` e `sortDirection` no navegador (localStorage), e carregar esses valores ao montar a página.
- Isto mantém exatamente “do jeito que você deixou”, independentemente de como voltou para a página (sidebar, atalhos, etc.).

Alterações (código)

1) Persistir ordenação em Pagamentos
Arquivo: `src/pages/finance/Payments.tsx`

1.1. Criar uma key versionada para evitar conflitos futuros
- Ex: `const PAYMENTS_SORT_KEY = 'finance-payments-sort-v1';`

1.2. Inicializar `sortField` e `sortDirection` lendo do localStorage (padrão igual ao atual)
- Trocar:
  - `useState<SortField>('payment_date')`
  - `useState<SortDirection>('desc')`
- Por inicializadores “lazy” (função), seguindo o padrão já usado no projeto (ex.: `src/pages/Leads.tsx`):
  - Ler JSON `{ field, direction }`
  - Validar valores (se vier algo inválido, cair no default)

Validação recomendada
- `SortField` permitido: `payment_date | sale_code | client_name | amount | payment_method | status`
- `SortDirection` permitido: `asc | desc`

1.3. Sempre que `sortField`/`sortDirection` mudar, gravar no localStorage
- Adicionar `useEffect(() => { localStorage.setItem(PAYMENTS_SORT_KEY, JSON.stringify({ field: sortField, direction: sortDirection })) }, [sortField, sortDirection])`
- Envolver em `try/catch` (segurança em ambientes onde localStorage falha).

1.4. Ajuste pequeno de UX (opcional, mas recomendado)
- Hoje, quando clica numa coluna “nova”, ele força direção “asc” sempre.
- Para ficar mais coerente com o que você descreveu (datas mais recentes primeiro), atualizar `handleSort` para:
  - Se o campo novo for `payment_date` → direção default `desc`
  - Caso contrário → `asc`
- Isto não é obrigatório para persistência, mas reduz “surpresas” quando alterna entre colunas.

2) (Recomendação de consistência) Aplicar o mesmo comportamento em Faturas
Motivo
- Em `src/components/finance/InvoicesContent.tsx` você acabou de adicionar setas/ordenação; a ordenação também vai resetar ao trocar de aba/página porque também está só em state local.

Arquivo: `src/components/finance/InvoicesContent.tsx`
- Repetir o mesmo padrão:
  - Key: `finance-invoices-sort-v1`
  - Lazy init lendo localStorage
  - `useEffect` gravando mudanças

Critérios de aceitação (o que você deve conseguir fazer e ver funcionando)
- Em /financeiro/pagamentos:
  1. Ordenar por qualquer coluna e direção (ex.: Valor desc).
  2. Ir para outra página (ex.: /financeiro) e voltar para /financeiro/pagamentos.
  3. A tabela continua com a mesma ordenação (campo e direção) e o ícone de seta continua correto.
- (Se aplicar também em Faturas) Repetir o mesmo teste na tab de Faturas.

Notas de compatibilidade
- Isto não mexe em backend nem em dados; é apenas preferência de UI no navegador.
- Não interfere com o filtro `?status=pending` já existente (esse continua vindo do URL).

Implementação: arquivos que serão alterados
- Obrigatório: `src/pages/finance/Payments.tsx`
- Recomendado (consistência): `src/components/finance/InvoicesContent.tsx`
