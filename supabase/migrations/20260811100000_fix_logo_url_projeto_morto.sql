-- Logo da Senvia deixou de aparecer nos emails.
--
-- Causa: os templates apontavam para o Storage do projeto Supabase ANTIGO
-- (zppcobirzgpfcrnxznwe), abandonado na migração para chhmfwlimtbsyjmgtokn.
-- Esse host já nem resolve — o pedido nem chega a devolver 404, falha na
-- ligação — por isso o <img> ficava vazio em todos os emails enviados.
--
-- Confirmado em produção (11/08/2026), 19 linhas afetadas:
--   email_templates.html_content  12   (inclui os que enviam mesmo:
--                                       "Boas vindas ao Lead", "Trial Ativado",
--                                       "Trial · Dia 3", "Ultimo dia trial")
--   email_campaigns.html_content   4
--   profiles.email_signature       3
--
-- Substituto: https://app.senvia.pt/senvia-logo-white.png
-- O ficheiro vive em public/senvia-logo-white.png, versionado no git e servido
-- pelo nosso próprio domínio. Verificado sha256 idêntico ao do Storage antigo:
--   9588fbee5172a2c1cf272c105572b20a5e09e7ccdce81474c07011685baa3ac2
-- É também o URL que o submit-lead já usa nos emails que gera em código, por
-- isso passa a haver uma única origem para o logótipo.
--
-- Escolheu-se o domínio próprio em vez do Storage do projeto novo de propósito:
-- foi precisamente um ref de projeto Supabase a mudar que partiu isto. O
-- public/ do repositório não depende de nenhum ref.

-- ── 1. O URL morto ──────────────────────────────────────────────────────────
UPDATE public.email_templates
SET html_content = replace(
      html_content,
      'https://zppcobirzgpfcrnxznwe.supabase.co/storage/v1/object/public/organization-logos/senvia-logo-white.png',
      'https://app.senvia.pt/senvia-logo-white.png')
WHERE html_content LIKE '%zppcobirzgpfcrnxznwe%';

UPDATE public.email_campaigns
SET html_content = replace(
      html_content,
      'https://zppcobirzgpfcrnxznwe.supabase.co/storage/v1/object/public/organization-logos/senvia-logo-white.png',
      'https://app.senvia.pt/senvia-logo-white.png')
WHERE html_content LIKE '%zppcobirzgpfcrnxznwe%';

UPDATE public.profiles
SET email_signature = replace(
      email_signature,
      'https://zppcobirzgpfcrnxznwe.supabase.co/storage/v1/object/public/organization-logos/senvia-logo-white.png',
      'https://app.senvia.pt/senvia-logo-white.png')
WHERE email_signature LIKE '%zppcobirzgpfcrnxznwe%';

-- ── 2. O mesmo logótipo alojado no imgbb ────────────────────────────────────
-- Ainda funciona hoje, mas é um alojamento de imagens gratuito de terceiros a
-- servir o logótipo de emails para clientes. sha256 confirmado igual ao acima,
-- por isso é literalmente o mesmo ficheiro — passa para o nosso domínio.
UPDATE public.email_templates
SET html_content = replace(html_content,
      'https://i.ibb.co/WvCRtkmk/Logo-Site.png',
      'https://app.senvia.pt/senvia-logo-white.png')
WHERE html_content LIKE '%i.ibb.co/WvCRtkmk/Logo-Site.png%';

UPDATE public.email_campaigns
SET html_content = replace(html_content,
      'https://i.ibb.co/WvCRtkmk/Logo-Site.png',
      'https://app.senvia.pt/senvia-logo-white.png')
WHERE html_content LIKE '%i.ibb.co/WvCRtkmk/Logo-Site.png%';

-- ── 3. Verificação ──────────────────────────────────────────────────────────
-- Todas as contagens têm de vir a 0.
SELECT 'templates_mortos'  AS check, count(*) FROM public.email_templates WHERE html_content    LIKE '%zppcobirzgpfcrnxznwe%'
UNION ALL SELECT 'campanhas_mortas', count(*) FROM public.email_campaigns WHERE html_content    LIKE '%zppcobirzgpfcrnxznwe%'
UNION ALL SELECT 'assinaturas_mortas', count(*) FROM public.profiles      WHERE email_signature LIKE '%zppcobirzgpfcrnxznwe%'
UNION ALL SELECT 'templates_imgbb',  count(*) FROM public.email_templates WHERE html_content    LIKE '%i.ibb.co%'
UNION ALL SELECT 'campanhas_imgbb',  count(*) FROM public.email_campaigns WHERE html_content    LIKE '%i.ibb.co%';
