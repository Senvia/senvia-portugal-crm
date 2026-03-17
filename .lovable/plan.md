
Objetivo
- Corrigir o modal “Marcar pagamento como pago?” e eliminar outros modais de confirmação que ainda estão largos no desktop.

Diagnóstico confirmado
- `src/pages/finance/Payments.tsx`: o modal “Marcar pagamento como pago?” usa `<DialogContent>` sem `className`, então herda `max-w-lg`.
- `src/components/ui/alert-dialog.tsx`: o `AlertDialogContent` global também está com `max-w-lg`.
- Existem muitos confirm dialogs a herdar esse padrão (sem largura explícita), por isso ainda aparecem “largos”.

Plano de implementação
1) Ajustar o modal reportado
- Em `Payments.tsx`, definir `className="max-w-md"` no `DialogContent` de “Marcar pagamento como pago?”.

2) Corrigir “outros assim” de forma global (confirmações)
- Em `src/components/ui/alert-dialog.tsx`, reduzir o padrão de `AlertDialogContent` de `max-w-lg` para `max-w-md`.
- Manter responsividade atual (`w-[calc(100vw-2rem)]`, top/safe-area e scroll).

3) Preservar exceções já específicas
- Não mexer em dialogs com `className` explícita (ex.: `max-w-sm`, `max-w-md`) nem em modais densos (`max-w-2xl`) já ajustados.
- Não tocar em `variant="fullScreen"`.

4) Varredura final de consistência
- Rebuscar no código por:
  - `DialogContent>` sem classe em fluxos de confirmação;
  - `AlertDialogContent>` sem classe (agora compactos por padrão).
- Garantir que não sobrou confirmação com largura acima do padrão compacto.

5) Validação visual rápida (desktop + mobile)
- Verificar no fluxo atual `/financeiro/pagamentos?status=pending`:
  - “Marcar pagamento como pago?”
  - 2–3 confirmações comuns (ex.: eliminar/remover) para confirmar uniformidade.
