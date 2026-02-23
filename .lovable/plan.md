
# Corrigir Padding da Landing Page

## Problema

Todas as seccoes da landing page usam `px-4` (16px) como padding horizontal. Em mobile, isto faz com que o conteudo fique demasiado colado as bordas do ecra, sem respiro visual.

## Solucao

Alterar o padding horizontal de `px-4` para `px-6 sm:px-8` em todas as seccoes da landing page. Isto dara:
- **Mobile**: 24px de padding (px-6)
- **Small+**: 32px de padding (sm:px-8)

Os ficheiros a alterar sao todos os 17 componentes em `src/components/landing/` que usam `container mx-auto px-4`:

| Ficheiro | Linha aprox. | De | Para |
|----------|-------------|-----|------|
| LandingHeader.tsx | 37 | `px-4` | `px-6 sm:px-8` |
| HeroSection.tsx | 20 | `px-4` | `px-6 sm:px-8` |
| SocialProofBar.tsx | 17 | `px-4` | `px-6 sm:px-8` |
| ProblemSection.tsx | 39 | `px-4` | `px-6 sm:px-8` |
| SolutionSteps.tsx | 44 | `px-4` | `px-6 sm:px-8` |
| DemoShowcase.tsx | 77 | `px-4` | `px-6 sm:px-8` |
| FeaturesGrid.tsx | 32 | `px-4` | `px-6 sm:px-8` |
| AISection.tsx | ~17 | `px-4` | `px-6 sm:px-8` |
| NichesSection.tsx | 39 | `px-4` | `px-6 sm:px-8` |
| ResultsSection.tsx | 17 | `px-4` | `px-6 sm:px-8` |
| TestimonialsSection.tsx | 36 | `px-4` | `px-6 sm:px-8` |
| PricingSection.tsx | 62 | `px-4` | `px-6 sm:px-8` |
| ComparisonTable.tsx | 38 | `px-4` | `px-6 sm:px-8` |
| TrustSection.tsx | 19 | `px-4` | `px-6 sm:px-8` |
| FAQSection.tsx | 46 | `px-4` | `px-6 sm:px-8` |
| FinalCTA.tsx | 15 | `px-4` | `px-6 sm:px-8` |
| LandingFooter.tsx | 37 | `px-4` | `px-6 sm:px-8` |

Todas as alteracoes sao simples substituicoes de classe CSS. Nenhuma logica ou base de dados afetada.
