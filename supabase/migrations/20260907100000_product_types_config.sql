-- ============================================================
-- Tipos de produto (Cartões, Energia, Gás, Fibra, Satélite, …)
-- ============================================================
-- Um produto do catálogo passa a pertencer a um ou mais tipos, e é o tipo que
-- decide a FORMA da comissão: escalões por quantidade nos cartões, "operadora
-- paga + comissão" na energia e no gás, e a percentagem sobre a fibra no
-- satélite. Os valores continuam a ser do produto.
--
-- Fica em JSONB na organização, ao lado do catálogo que já lá vive
-- (servicos_products_config): é configuração pequena, lida sempre em conjunto
-- com ele, e assim não precisa de tabela nem de políticas RLS próprias.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS product_types_config jsonb;

COMMENT ON COLUMN public.organizations.product_types_config IS
  'Product types for the telecom catalog: [{id, name, shape, exclusive_group, archived}]. '
  'shape drives which commission fields a product shows for that type '
  '(operator_seller | tiers | satellite_of_fibre). NULL means the org has not '
  'configured any and the seeded defaults apply.';

-- organizations has column-level SELECT grants (secrets stay unreadable), so
-- a new column is invisible to the app until it is granted like its siblings.
-- Without this every organization fetch that named the column returned 403.
GRANT SELECT (product_types_config) ON public.organizations TO authenticated, anon;
