
Diagnóstico confirmado: o erro continua porque o Apify rejeita o idioma enviado como `pt`.  
A função está a devolver 502 com a mensagem de validação do Apify (“`input.language` must be one of ... `pt-PT`, `pt-BR`, ...”).  
Ou seja: o problema não é timeout agora; é valor de idioma inválido no payload.

## Plano de correção

1) Corrigir idioma no modal (UI)
- Ficheiro: `src/components/prospects/GenerateProspectsDialog.tsx`
- Alterar valor default de `language` de `pt` para `pt-PT`.
- Atualizar opções do select para códigos válidos do Apify:
  - `pt-PT` (Português Portugal)
  - `pt-BR` (Português Brasil)
  - `en`, `es`, `fr` (e manter os restantes que quiseres expor depois).

2) Tornar a edge function resiliente a valores antigos
- Ficheiro: `supabase/functions/generate-prospects/index.ts`
- Trocar default backend para `language = "pt-PT"`.
- Adicionar normalização antes de chamar Apify:
  - `pt -> pt-PT`
  - (opcional) `br -> pt-BR`
- Se vier idioma inválido, devolver `400` com erro claro em PT (em vez de deixar ir ao Apify e voltar 502).

3) Melhorar mensagem de erro no frontend
- Ficheiro: `src/hooks/useProspects.ts`
- No `useGenerateProspects`, quando `invoke` der non-2xx, tentar ler `startError.context` (JSON/body) para mostrar o erro real no toast.
- Assim deixa de aparecer só “Edge Function returned a non-2xx status code”.

4) Validação final (sem mexer no fluxo P2G)
- Testar geração com defaults (sem alterar idioma manualmente): deve criar `jobId` e entrar em polling.
- Confirmar conclusão via `check-prospect-job`.
- Confirmar que P2G continua sem alterações no fluxo deles (Importar continua igual).

## Ficheiros a alterar
- `src/components/prospects/GenerateProspectsDialog.tsx`
- `supabase/functions/generate-prospects/index.ts`
- `src/hooks/useProspects.ts`
