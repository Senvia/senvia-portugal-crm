

## Mostrar redes sociais dos Prospects extraídos

### Problema
O Apify devolve campos como `facebookUrl`, `instagramUrl`, etc., mas o `check-prospect-job` não os guarda no `metadata` — só guarda `address`, `rating`, `website`, etc. Além disso, a UI (tabela e cards) não mostra esses campos.

### Alterações

**1) `supabase/functions/check-prospect-job/index.ts`** — guardar redes sociais no metadata
- Expandir o `ApifyItem` interface com campos: `facebookUrl`, `instagramUrl`, `twitterUrl`, `youtubeUrl`, `tiktokUrl`
- No bloco de construção do `metadata` (linha ~184), adicionar:
  - `facebook: item.facebookUrl || null`
  - `instagram: item.instagramUrl || null`
  - `twitter: item.twitterUrl || null`
  - `youtube: item.youtubeUrl || null`
  - `tiktok: item.tiktokUrl || null`

**2) `src/pages/Prospects.tsx`** — mostrar redes sociais na UI (apenas para não-P2G)
- Na versão mobile (cards): adicionar linha "Redes sociais" com ícones/links clicáveis para cada rede presente no `metadata`
- Na versão desktop (tabela): adicionar coluna "Redes Sociais" com ícones clicáveis (Facebook, Instagram, etc.) — cada ícone só aparece se o URL existir no metadata
- Usar ícones do lucide-react (`Facebook`, `Instagram`, `Globe`) ou simples badges com texto

**3) Deploy** da edge function `check-prospect-job` atualizada

### Nota
Os prospects já importados **não** terão redes sociais porque o metadata foi guardado sem esses campos. Será necessário gerar novamente para obter os dados completos. Alternativa: podemos re-processar os jobs existentes, mas isso requer acesso ao dataset do Apify (que expira após algum tempo).

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/check-prospect-job/index.ts` | Guardar redes sociais no metadata |
| `src/pages/Prospects.tsx` | Mostrar coluna/linha de redes sociais |

