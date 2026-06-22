# Unificação do Onboarding — Proposta Técnica

## Problema

Hoje existem dois sistemas:
1. **Sistema atual:** `org_onboarding_state` (tabela) + `onboarding.ts` (funil global) + `tours.ts` + FAB do Otto
2. **Proposto:** `org_onboarding_module_state` (tabela nova) + badge + peek por módulo

Se construirmos o #2 sem tocar no #1, ficamos com dois sistemas a competir.

## Solução: Um modelo único

### 1. Estado: só `org_onboarding_state`

Em vez de criar uma tabela nova, **aproveitamos a que já existe** e adicionamos uma coluna:

```sql
-- Já existe:
-- org_onboarding_state (organization_id, current_step, completed_steps[], dismissed, etc.)

-- Adicionar:
ALTER TABLE org_onboarding_state ADD COLUMN module_dismissed jsonb DEFAULT '{}';
-- Exemplo: {"leads": "2026-06-22T10:00:00Z", "clients": null, "sales": null, ...}
```

**Porquê?**
- Não duplica estado
- O badge "completado" calcula-se dos sinais reais (`first_lead_at`, `first_sale_at`, etc.)
- O `module_dismissed` guarda só quando o cliente disse "Agora não"
- Se o cliente fizer algo fora do chat, o badge atualiza sozinho

### 2. Badge derivado dos sinais (não de clicks no Otto)

Os 8 módulos mapeiam para colunas reais em `organizations`:

| Módulo | Sinal real | Coluna |
|--------|-----------|--------|
| Leads | Criou/importou 1+ lead | `first_lead_at` |
| Clientes | Criou 1+ cliente | `first_client_at` |
| Vendas | Criou 1+ venda | `first_sale_at` |
| Propostas | Criou 1+ proposta | `first_proposal_at` |
| Faturação | Configurou método | `billing_provider IS NOT NULL` |
| Integrações | Conectou 1+ integração | `integrations_enabled` |
| Inbox | Conectou WhatsApp/email | `whatsapp_instance IS NOT NULL` |
| Equipa | Convidou 1+ membro | (query à org_members) |

**Regra:** O badge mostra `(X/8)` onde X = número de sinais verdadeiros. Se o cliente cria uma lead pelo site (não pelo Otto), o badge atualiza na mesma.

### 3. Peek: como funciona

Quando o cliente entra num módulo:

```
1. Rota do módulo carrega
2. Frontend verifica:
   a. Já completou? (sinal real existe) → não faz nada
   b. Já dispensou? (module_dismissed tem timestamp) → não faz nada
   c. Nunca viu? → mostra bolha do Otto (peek suave)
3. Se o cliente clica "Agora não" → guarda timestamp em module_dismissed
4. Se o cliente interage → Otto guia, e quando completa, o sinal real atualiza sozinho
```

**Peek suave = bolha do Otto** (não modal, não pop-up). Aparece uma vez, no primeiro acesso ao módulo. Depois de dispensado, nunca mais.

### 4. Fase 1: só 4 módulos

Implementar apenas:

1. **Leads** — "Cria a tua primeira lead"
2. **Clientes** — "Converte uma lead em cliente"
3. **Vendas** — "Regista a tua primeira venda"
4. **Propostas** — "Cria a tua primeira proposta"

Os outros 5 (Faturação, Integrações, Inbox, Marketing, Equipa) ficam para Fase 2, depois de medir se a Fase 1 melhora a conversão.

### 5. O que acontece ao sistema atual

- `onboarding.ts` (funil global) — **mantém-se** como fallback para o FAB do Otto (quando o cliente clica no Otto sem estar num módulo específico)
- `tours.ts` — **mantém-se** para tours determinísticos (ex: "mostrar como criar pipeline" na primeira vez)
- `org_onboarding_state.current_step` — **deixa de ser usado** para o badge; o badge passa a ser derivado dos sinais
- FAB do Otto — **mantém-se**, mas o badge na sidebar substitui o badge do FAB

### 6. Resumo das alterações

| O quê | Ação |
|-------|------|
| `org_onboarding_state` | Adicionar coluna `module_dismissed jsonb` |
| `onboarding.ts` | Manter (fallback do FAB) |
| `tours.ts` | Manter |
| Badge na sidebar | Novo componente, derivado de `organizations.first_*_at` |
| Peek por módulo | Novo hook `useModuleOnboarding(moduleKey)` |
| Scripts do Otto | 4 scripts (Leads, Clientes, Vendas, Propostas) |
| `create_sample_data()` | **Não implementar** (Claude tem razão) |
| WhatsApp | Manter fluxo QR (não headless) |

---

*Documento criado por Amora em 22/06/2026 — para aprovação do Thiago antes de codificar.*
