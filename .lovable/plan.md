
Objetivo: corrigir o fluxo de criação de venda para que, ao marcar como **Concluída** no ato da criação, a **Data de Ativação** seja pedida e gravada (evitando exclusão no módulo de comissões).

1) Ajustar UI de criação de venda  
Arquivo: `src/components/sales/CreateSaleModal.tsx`
- Adicionar estado `activationDate` no modal.
- Exibir campo `Data de Ativação` no bloco “Dados da Venda” quando o estado selecionado exigir ativação (mínimo: `delivered`/Concluída; opcionalmente alinhar com padrão atual de `fulfilled`/`in_progress`).
- No submit, validar:
  - se estado for `delivered` e data vazia → bloquear envio e mostrar feedback.
- Incluir `activation_date` no payload enviado para `createSale.mutateAsync(...)`.

2) Persistir data de ativação na criação  
Arquivo: `src/hooks/useSales.ts` (`useCreateSale`)
- Expandir tipo de entrada da mutation para aceitar `activation_date?: string`.
- No `insert` de `sales`, persistir `activation_date` (ou `null`).
- Se `activation_date` vier preenchida, criar também registo em `sale_activation_history` com nota coerente ao estado inicial (ex.: “Concluída”).

3) Garantir consistência com comissões
- Manter filtro de comissões por `status='delivered'` + intervalo de `activation_date` (já está correto).
- Com a data preenchida na criação, a venda entra imediatamente no mês selecionado em comissões.

4) Validação funcional (fim-a-fim)
- Criar nova venda com estado **Concluída**:
  - sistema pede/mostra `Data de Ativação`;
  - gravação concluída com `activation_date` no registo.
- Abrir módulo de comissões no mesmo mês da ativação:
  - CPE/CUI aparece na listagem;
  - consumo anual soma no totalizador;
  - comissão é calculada normalmente.
- Repetir com estado “Em Progresso” para garantir que não quebra o fluxo padrão de criação.

Detalhes técnicos
- Causa confirmada: a venda `0012` está `status='delivered'` com `activation_date = null`, por isso fica fora da query de comissões por mês.
- Não requer migração de base de dados; é ajuste de fluxo de frontend + mutation de criação.
