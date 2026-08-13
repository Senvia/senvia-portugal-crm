-- Otto: pesquisa abrangente em todos os RPCs search_*_unaccent
-- nome, email, nif, empresa, produto, valor, código, etc.
-- Correcção aplicada por Cactus (2026-08-13): os RPCs originais só pesquisavam
-- alguns campos de texto (code/notes/reference) e nunca o nome do cliente nem
-- o produto, por isso o Otto não encontrava registos por "Daniel" ou "Starter".

-- ---------- SALES ----------
CREATE OR REPLACE FUNCTION public.search_sales_unaccent(org_id uuid, search_term text, pay_status text DEFAULT NULL::text, max_results integer DEFAULT 10)
  RETURNS SETOF sales
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS like_pat,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS num_pat
  ),
  matches AS (
    SELECT DISTINCT s.id
    FROM sales s
    CROSS JOIN q
    WHERE s.organization_id = org_id
      AND (pay_status IS NULL OR s.payment_status = pay_status)
      AND (
        immutable_unaccent(lower(COALESCE(s.code,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.notes,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.invoice_reference,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.payment_method,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.payment_status,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.negotiation_type,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.modelo_servico,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.servicos_produtos::text,''))) LIKE q.like_pat
        OR immutable_unaccent(lower(COALESCE(s.servicos_details::text,''))) LIKE q.like_pat
        OR EXISTS (
            SELECT 1 FROM crm_clients c
            WHERE c.id = s.client_id
              AND (
                immutable_unaccent(lower(COALESCE(c.name,''))) LIKE q.like_pat
                OR immutable_unaccent(lower(COALESCE(c.email,''))) LIKE q.like_pat
                OR immutable_unaccent(lower(COALESCE(c.nif,''))) LIKE q.like_pat
                OR immutable_unaccent(lower(COALESCE(c.company,''))) LIKE q.like_pat
              )
        )
        OR EXISTS (
            SELECT 1 FROM sale_items si
            WHERE si.sale_id = s.id
              AND (
                immutable_unaccent(lower(COALESCE(si.name,''))) LIKE q.like_pat
                OR EXISTS (
                    SELECT 1 FROM products p
                    WHERE p.id = si.product_id
                      AND (
                        immutable_unaccent(lower(COALESCE(p.name,''))) LIKE q.like_pat
                        OR immutable_unaccent(lower(COALESCE(p.sku,''))) LIKE q.like_pat
                        OR immutable_unaccent(lower(COALESCE(p.code,''))) LIKE q.like_pat
                      )
                )
              )
        )
        OR (
          q.num_pat IS NOT NULL
          AND (
            s.total_value::text LIKE q.num_pat || '%'
            OR s.subtotal::text LIKE q.num_pat || '%'
            OR s.discount::text LIKE q.num_pat || '%'
            OR s.recurring_value::text LIKE q.num_pat || '%'
            OR s.comissao::text LIKE q.num_pat || '%'
          )
        )
      )
  )
  SELECT s.*
  FROM sales s
  JOIN matches m ON m.id = s.id
  ORDER BY s.created_at DESC
  LIMIT max_results;
$function$;

-- ---------- CLIENTS ----------
CREATE OR REPLACE FUNCTION public.search_clients_unaccent(org_id uuid, search_term text, max_results integer DEFAULT 10)
  RETURNS SETOF crm_clients LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS p,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS n
  )
  SELECT c.* FROM crm_clients c CROSS JOIN q
  WHERE c.organization_id = org_id
    AND (
      immutable_unaccent(lower(COALESCE(c.name,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.email,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.phone,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.whatsapp,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.nif,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.company,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.company_nif,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.code,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.city,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.distrito,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.conselho,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(c.grupo_economico,''))) LIKE q.p
      OR (q.n IS NOT NULL AND c.total_value::text LIKE q.n || '%')
    )
  ORDER BY c.created_at DESC
  LIMIT max_results;
$function$;

-- ---------- LEADS ----------
CREATE OR REPLACE FUNCTION public.search_leads_unaccent(org_id uuid, search_term text, lead_status text DEFAULT NULL::text, max_results integer DEFAULT 10)
  RETURNS SETOF leads LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS p,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS n
  )
  SELECT l.* FROM leads l CROSS JOIN q
  WHERE l.organization_id = org_id
    AND (lead_status IS NULL OR l.status = lead_status)
    AND (
      immutable_unaccent(lower(COALESCE(l.name,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.email,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.phone,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.company_nif,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.company_name,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.tipologia,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.temperature,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.status,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(l.source,''))) LIKE q.p
      OR (q.n IS NOT NULL AND l.value::text LIKE q.n || '%')
    )
  ORDER BY l.created_at DESC
  LIMIT max_results;
$function$;

-- ---------- INVOICES ----------
CREATE OR REPLACE FUNCTION public.search_invoices_unaccent(org_id uuid, search_term text, inv_status text DEFAULT NULL::text, max_results integer DEFAULT 10)
  RETURNS SETOF invoices LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS p,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS n
  )
  SELECT i.* FROM invoices i CROSS JOIN q
  WHERE i.organization_id = org_id
    AND (inv_status IS NULL OR i.status = inv_status)
    AND (
      immutable_unaccent(lower(COALESCE(i.reference,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(i.client_name,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(i.document_type,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(i.status,''))) LIKE q.p
      OR (q.n IS NOT NULL AND i.total::text LIKE q.n || '%')
      OR EXISTS (
        SELECT 1 FROM crm_clients c
        WHERE c.id = (SELECT s.client_id FROM sales s WHERE s.id = i.sale_id)
          AND (immutable_unaccent(lower(COALESCE(c.name,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.email,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.nif,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.company,''))) LIKE q.p)
      )
    )
  ORDER BY i.date DESC NULLS LAST
  LIMIT max_results;
$function$;

-- ---------- PROPOSALS ----------
CREATE OR REPLACE FUNCTION public.search_proposals_unaccent(org_id uuid, search_term text, prop_status text DEFAULT NULL::text, max_results integer DEFAULT 10)
  RETURNS SETOF proposals LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS p,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS n
  )
  SELECT pr.* FROM proposals pr CROSS JOIN q
  WHERE pr.organization_id = org_id
    AND (prop_status IS NULL OR pr.status = prop_status)
    AND (
      immutable_unaccent(lower(COALESCE(pr.code,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.notes,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.negotiation_type,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.modelo_servico,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.proposal_type,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.servicos_produtos::text,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(pr.servicos_details::text,''))) LIKE q.p
      OR EXISTS (
        SELECT 1 FROM crm_clients c
        WHERE c.id = pr.client_id
          AND (immutable_unaccent(lower(COALESCE(c.name,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.email,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.nif,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(c.company,''))) LIKE q.p)
      )
      OR EXISTS (
        SELECT 1 FROM proposal_products pp JOIN products p ON p.id = pp.product_id
        WHERE pp.proposal_id = pr.id
          AND (immutable_unaccent(lower(COALESCE(p.name,''))) LIKE q.p
               OR immutable_unaccent(lower(COALESCE(p.sku,''))) LIKE q.p)
      )
      OR (q.n IS NOT NULL AND pr.total_value::text LIKE q.n || '%')
    )
  ORDER BY pr.created_at DESC
  LIMIT max_results;
$function$;

-- ---------- CREDIT NOTES ----------
CREATE OR REPLACE FUNCTION public.search_credit_notes_unaccent(org_id uuid, search_term text, cn_status text DEFAULT NULL::text, max_results integer DEFAULT 10)
  RETURNS SETOF credit_notes LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT '%' || immutable_unaccent(lower(search_term)) || '%' AS p,
           NULLIF(regexp_replace(search_term, '[^0-9.,]', '', 'g'), '') AS n
  )
  SELECT cn.* FROM credit_notes cn CROSS JOIN q
  WHERE cn.organization_id = org_id
    AND (cn_status IS NULL OR cn.status = cn_status)
    AND (
      immutable_unaccent(lower(COALESCE(cn.reference,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(cn.client_name,''))) LIKE q.p
      OR immutable_unaccent(lower(COALESCE(cn.status,''))) LIKE q.p
      OR (q.n IS NOT NULL AND cn.total::text LIKE q.n || '%')
    )
  ORDER BY cn.date DESC NULLS LAST
  LIMIT max_results;
$function$;
