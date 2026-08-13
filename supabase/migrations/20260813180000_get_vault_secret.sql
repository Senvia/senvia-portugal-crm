-- Ler um segredo do Vault a partir de uma edge function.
-- SECURITY DEFINER porque o vault não é acessível de fora; e revogado de toda a
-- gente menos o service_role — se qualquer utilizador autenticado pudesse
-- chamar isto, o Vault deixava de servir para alguma coisa.
CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_name LIMIT 1;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_vault_secret(TEXT) FROM PUBLIC, authenticated, anon;
