

## Adicionar todos os filtros Apify ao dialog "Gerar Prospects"

### O que falta
O dialog actual só tem 5 campos (termos, localização, máximo, idioma, ignorar fechados). As screenshots mostram muitos mais filtros do Apify que devem ser expostos, traduzidos em PT.

### Filtros a adicionar (organizados em secções colapsáveis)

**Secção principal** (já existe, melhorar):
- Termos de pesquisa (textarea) ✓
- Localização ✓
- Máximo de resultados ✓
- Idioma ✓

**Secção: Filtros de pesquisa e categorias** (colapsável):
- Correspondência exacta de nome (select: "Todos os locais" / "Apenas correspondência exacta") → `searchMatching`
- Avaliação mínima (select: Todas / 1-5 estrelas) → `placeMinimumStars`
- Filtrar por website (select: Todos / Só com website / Só sem website) → `website`
- Ignorar locais fechados (switch) ✓ → mover para aqui

**Secção: Detalhes adicionais** (colapsável):
- Extrair página de detalhes (switch) → `scrapePlaceDetailPage`
- Extrair dados de reserva (switch) → `scrapeTableReservationProvider`
- Incluir resultados web (switch) → `includeWebResults`
- Extrair dentro de centros comerciais (switch) → `scrapeDirectories`
- Número de perguntas a extrair (input number) → `maxQuestions`

**Secção: Enriquecimento de contactos** (colapsável):
- Extrair contactos do website (switch) → `scrapeContacts`
- Redes sociais — Facebook, Instagram, YouTube, TikTok, X/Twitter (switches individuais) → `scrapeSocialMediaProfiles`

**Secção: Enriquecimento de leads** (colapsável):
- Máximo de leads por local (input number) → `maximumLeadsEnrichmentRecords`

**Secção: URLs do Google Maps** (colapsável):
- URLs directas (textarea, alternativa aos termos) → `startUrls`
- Nota: não combinar com termos de pesquisa

### Alterações por ficheiro

**`src/components/prospects/GenerateProspectsDialog.tsx`**
- Adicionar state para cada novo campo
- Organizar em secções colapsáveis com `Collapsible` do shadcn
- Passar todos os parâmetros no `mutate()`
- UI limpa com secções expandíveis tipo acordeão

**`supabase/functions/generate-prospects/index.ts`**
- Receber todos os novos campos do body request
- Mapear directamente para o `actorInput` (os nomes já correspondem 1:1 ao Apify)
- Adicionar `startUrls` (array de `{ url }`) quando fornecido

**`src/hooks/useProspects.ts`**
- Expandir o tipo do `mutationFn` params para incluir todos os novos campos opcionais

### Mapeamento campo UI → Apify

| Campo UI (PT) | Apify param |
|---|---|
| Correspondência exacta | `searchMatching` ("all" / "exact") |
| Avaliação mínima | `placeMinimumStars` ("" / "1"-"5") |
| Filtrar por website | `website` ("allPlaces" / "withWebsite" / "withoutWebsite") |
| Extrair detalhes | `scrapePlaceDetailPage` |
| Extrair reservas | `scrapeTableReservationProvider` |
| Resultados web | `includeWebResults` |
| Centros comerciais | `scrapeDirectories` |
| Perguntas | `maxQuestions` |
| Contactos website | `scrapeContacts` |
| Facebook/Insta/etc | `scrapeSocialMediaProfiles.facebooks` etc |
| Leads por local | `maximumLeadsEnrichmentRecords` |
| URLs Google Maps | `startUrls` |

