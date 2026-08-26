-- `search_path` fixo nas funções SECURITY DEFINER.
--
-- PORQUE É QUE ISTO IMPORTA
--
-- Uma função SECURITY DEFINER corre com os privilégios de quem a criou — aqui,
-- o dono da base de dados. Se o `search_path` dela não estiver fixo, é o
-- CHAMADOR que decide onde é que os nomes não qualificados vão ser procurados.
--
-- O ataque é este: alguém cria uma tabela `leads` num esquema próprio, põe esse
-- esquema à frente no `search_path`, e chama a função. Ela corre com privilégios
-- de dono contra a tabela DELE. A partir daí lê e escreve o que quiser.
--
-- Fixar o `search_path` fecha isso. O `pg_temp` vai explicitamente NO FIM: se
-- não for nomeado, o Postgres procura-o SEMPRE PRIMEIRO — e um esquema temporário
-- é escrito por qualquer sessão, o que é exatamente o buraco que se quer tapar.
--
-- São seis. As outras que o analisador apontou pertencem às extensões `pg_trgm`
-- e `unaccent`: não são nossas e nem sequer são SECURITY DEFINER.

ALTER FUNCTION public.create_default_lead_intake_webhook()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.enqueue_trial_whatsapp_nudges()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_recurring_sale_commission()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_next_channel_assignee(p_channel_id uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_next_round_robin_assignee(p_org_id uuid, p_exclude_admins boolean)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.merge_messaging_channel_metadata_by_id(p_channel_id uuid, p_patch jsonb)
  SET search_path = public, pg_temp;

-- ── As duas vistas SECURITY DEFINER ficam como estão ────────────────────────
--
-- O analisador de segurança da Supabase aponta `sales_with_recurrence` e
-- `stripe_connection_summaries` por serem SECURITY DEFINER. Foram lidas as duas:
-- ambas terminam em `WHERE is_org_member(auth.uid(), organization_id)`, ou seja,
-- filtram pela organização de quem consulta.
--
-- São definer DE PROPÓSITO, e a `stripe_connection_summaries` é o exemplo de
-- porquê: a tabela `stripe_connections` está trancada (RLS sem políticas) e a
-- vista é a única forma de o CRM ver o estado da ligação — já com o id da conta
-- mascarado. Ligar `security_invoker` nela devolvia zero linhas a toda a gente.
--
-- Fica escrito aqui para a próxima pessoa que corra o analisador não "corrigir"
-- o que está certo.
