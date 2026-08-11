-- Leads vindos de anúncios do Facebook estavam gravados como "Direto".
--
-- Sintoma: a Senvia Agency recebeu leads de tráfego pago em agosto, mas o
-- cartão "Tráfego Pago" do dashboard mostrava zero.
--
-- Causa: a deteção de origem (src/lib/source-detection.ts) só procurava o
-- fbclid no URL da página onde está o formulário. Quem clica no anúncio,
-- aterra numa página e converte noutra já não traz o fbclid no URL, por isso
-- caía no fim da cadeia: "Direto".
--
-- O cookie _fbc do Pixel, esse, já estava a ser guardado em custom_data — mas
-- só para efeitos de correspondência na Conversions API, nunca para atribuir a
-- origem. E o _fbc SÓ existe quando a visita chegou com um fbclid: o formato é
-- fb.<subdominio>.<criado_em_ms>.<fbclid>. Ou seja, a prova do clique no
-- anúncio estava guardada na própria linha da lead o tempo todo.
--
-- O código já foi corrigido para usar o _fbc. Isto reatribui o que já entrou.
--
-- Alcance verificado em produção (11/08/2026): 2 leads, ambos da Senvia
-- Agency, ambos de 10/08 (Ricardo e Esmilson). Nenhuma outra organização tem
-- leads nesta situação — a Senvia Agency é a única a correr anúncios Meta para
-- o próprio funil.

UPDATE public.leads
SET source = 'Facebook Ads'
WHERE custom_data->>'fbc' IS NOT NULL
  AND custom_data->>'fbc' <> ''
  -- Só o formato legítimo do Pixel conta como prova de clique.
  AND split_part(custom_data->>'fbc', '.', 1) = 'fb'
  AND split_part(custom_data->>'fbc', '.', 4) <> ''
  -- Nunca sobrepõe uma origem já atribuída a tráfego pago nem uma escolha
  -- explícita: só corrige as que caíram no fim da cadeia de deteção.
  AND source IN ('Direto', 'Landing Page')
  -- Dentro da janela de atribuição de 28 dias da Meta, contada a partir da
  -- criação do cookie (o 3.º segmento, em milissegundos).
  AND (split_part(custom_data->>'fbc', '.', 3) ~ '^[0-9]+$')
  AND created_at
      - to_timestamp(split_part(custom_data->>'fbc', '.', 3)::bigint / 1000.0)
      <= interval '28 days';

-- Verificação: não deve sobrar nenhuma lead com prova de clique em anúncio
-- classificada como tráfego não pago.
SELECT o.name, l.source, count(*)
FROM public.leads l
JOIN public.organizations o ON o.id = l.organization_id
WHERE l.custom_data->>'fbc' IS NOT NULL
  AND l.custom_data->>'fbc' <> ''
  AND l.source !~* '(ads|pago|paid)'
GROUP BY 1, 2;
