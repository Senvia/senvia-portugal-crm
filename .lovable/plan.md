

## Mostrar saldos de férias da equipa no painel admin da página RH

### Problema
O card de saldo de férias só mostra o saldo do utilizador logado. O admin adicionou saldos para Nuno e Thiago mas não vê nada porque não tem saldo configurado para si próprio. Os saldos existem na BD e estão correctos — o problema é apenas de visibilidade na UI.

### Solução

**Ficheiro: `src/components/portal-total-link/rh/RhAdminPanel.tsx`**

Adicionar uma secção "Saldos da Equipa" visível directamente no painel admin (fora do dialog), mostrando uma tabela/lista resumida com:
- Nome do membro
- Dias totais / utilizados / disponíveis
- Botão "Gerir Saldos" para abrir o dialog de edição

Isto dá ao admin visibilidade imediata dos saldos sem ter de abrir o dialog.

**Ficheiro: `src/pages/portal-total-link/Rh.tsx`**

Opcionalmente, também adicionar saldo próprio do admin — se o admin quiser marcar férias, também precisa de ter saldo configurado. Podemos mostrar uma mensagem mais clara: "Configure o seu próprio saldo em 'Gerir Saldos'" quando o admin não tem saldo.

### Ficheiros alterados
- `src/components/portal-total-link/rh/RhAdminPanel.tsx` — secção de saldos visível directamente no painel
