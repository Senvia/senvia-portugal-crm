

## Gerar Prospects via Apify Google Maps (exceto P2G)

### Contexto
- P2G usa o fluxo actual (importação de ficheiros Excel/CSV com NIF, CPE, segmento energético) — **não será alterado**
- Todas as outras organizações com plano Elite terão um botão **"Gerar Prospects"** que lança o scraper do Google Maps via Apify
- O módulo Prospects deve ser bloqueado ao plano Elite via `MODULE_REQUIRED_PLAN`

### Alterações

#### 1) Bloquear Prospects ao plano Elite
**`src/hooks/useSubscription.ts`** — adicionar `prospects: 'Elite'` ao `MODULE_REQUIRED_PLAN`

#### 2) Edge function `generate-prospects`
**`supabase/functions/generate-prospects/index.ts`**

- Recebe parâmetros de busca (searchStrings, location, maxResults, language, etc.)
- Valida JWT + organização
- Chama o Actor Apify `2Mdma1N6Fd0y3QEjR` (Google Maps Scraper) com a API key guardada como secret
- Aguarda conclusão do run (polling com timeout de 5 min)
- Busca os resultados do dataset
- Mapeia cada item para a tabela `prospects` (company_name ← title, phone, email/website, metadata com address, rating, etc.)
- Faz upsert na tabela `prospects` usando company_name + phone como chave de deduplicação
- Retorna contagem de inseridos/atualizados

**Secret necessário**: `APIFY_API_TOKEN` — será pedido ao utilizador via `add_secret`

#### 3) Dialog de configuração da busca
**`src/components/prospects/GenerateProspectsDialog.tsx`**

Formulário com os parâmetros do scraper:
- **Termos de pesquisa** (textarea, um por linha) — ex: "restaurante", "cabeleireiro"
- **Localização** (input) — ex: "Lisboa, Portugal"
- **Máximo de resultados** (input number, default: 50)
- **Idioma** (select: pt, en, es — default: pt)
- **Ignorar locais fechados** (switch, default: true)
- Botão "Gerar" que chama a edge function e mostra progresso

#### 4) Página de Prospects — condicional P2G vs outros
**`src/pages/Prospects.tsx`**

- Importar `isPerfect2GetherOrg` 
- Se **é P2G**: mostrar botão "Importar" (comportamento actual, sem alterações)
- Se **não é P2G**: mostrar botão "Gerar Prospects" em vez de "Importar", que abre o `GenerateProspectsDialog`
- A tabela, filtros, distribuição e exportação ficam iguais para ambos

#### 5) Hook `useGenerateProspects`
**`src/hooks/useProspects.ts`** — novo mutation hook

- Chama `supabase.functions.invoke('generate-prospects', { body })` 
- Invalida query de prospects no sucesso
- Toast com resultado

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useSubscription.ts` | Adicionar `prospects: 'Elite'` |
| `supabase/functions/generate-prospects/index.ts` | Nova edge function |
| `src/components/prospects/GenerateProspectsDialog.tsx` | Novo dialog de configuração |
| `src/pages/Prospects.tsx` | Condicional P2G vs "Gerar Prospects" |
| `src/hooks/useProspects.ts` | Novo hook `useGenerateProspects` |
| Secret `APIFY_API_TOKEN` | Pedido ao utilizador |

### Mapeamento Apify → Prospects
| Campo Apify | Campo Prospects |
|-------------|----------------|
| `title` | `company_name` |
| `phone` | `phone` |
| `website` | `email` (se contiver @) ou `metadata.website` |
| `address` | `metadata.address` |
| `categoryName` | `segment` |
| `totalScore` | `metadata.rating` |
| `url` | `metadata.google_maps_url` |

