
# Otto: Acoes Rapidas Contextuais por Pagina

## Objectivo
O Otto vai mostrar sugestoes diferentes conforme a pagina onde o utilizador esta. Por exemplo, em `/leads` mostra "Como criar um lead?" e "Configurar pipeline", mas em `/sales` mostra "Criar uma venda" e "Emitir fatura".

## Alteracoes

### 1. `src/components/otto/OttoQuickActions.tsx`
Refactoring completo para suportar acoes contextuais:

- Criar um mapa `PAGE_ACTIONS` que associa cada rota a um conjunto de acoes rapidas relevantes
- Usar `useLocation()` do React Router para detectar a pagina actual
- Fazer match da rota e mostrar as acoes correspondentes
- Manter um conjunto de acoes "default" como fallback

**Mapa de rotas e acoes:**

| Pagina | Acoes |
|--------|-------|
| `/dashboard` | Resumo do negocio, Personalizar dashboard, Ver leads recentes |
| `/leads` | Como criar um lead?, Configurar pipeline, Importar leads, Mover lead de etapa |
| `/clients` | Criar cliente, Campos personalizados, Converter lead em cliente |
| `/calendar` | Agendar reuniao, Criar lembrete, Tipos de evento |
| `/proposals` | Criar proposta, Enviar por email, Converter em venda |
| `/sales` | Criar venda, Emitir fatura, Registar pagamento, Vendas recorrentes |
| `/financeiro*` | Registar despesa, Configurar contas, Sincronizar faturas |
| `/marketing*` | Criar campanha, Gerir templates, Importar contactos |
| `/ecommerce*` | Adicionar produto, Gerir encomendas, Codigos de desconto |
| `/settings` | Integrações, Gerir equipa, Pipeline, Plano e faturação |
| fallback (default) | Como criar um lead?, Gerir pipeline, Enviar proposta, Configuracoes |

### 2. `src/components/otto/OttoChatWindow.tsx`
- Nenhuma alteracao necessaria -- ja passa `onSelect` para o `OttoQuickActions`

### Detalhe Tecnico

```text
// OttoQuickActions.tsx
import { useLocation } from "react-router-dom";

const PAGE_ACTIONS: Record<string, Array<{ label: string; icon: LucideIcon }>> = {
  "/dashboard": [ ... ],
  "/leads": [ ... ],
  "/clients": [ ... ],
  ...
};

const DEFAULT_ACTIONS = [ ... ];

function getActionsForPath(pathname: string) {
  // Match exacto primeiro, depois prefixo (ex: /financeiro/despesas -> /financeiro)
  if (PAGE_ACTIONS[pathname]) return PAGE_ACTIONS[pathname];
  const prefix = Object.keys(PAGE_ACTIONS).find(k => pathname.startsWith(k));
  return prefix ? PAGE_ACTIONS[prefix] : DEFAULT_ACTIONS;
}

export function OttoQuickActions({ onSelect }) {
  const { pathname } = useLocation();
  const actions = getActionsForPath(pathname);
  // ... render botoes
}
```

### Ficheiros alterados
- `src/components/otto/OttoQuickActions.tsx` -- unico ficheiro a alterar
