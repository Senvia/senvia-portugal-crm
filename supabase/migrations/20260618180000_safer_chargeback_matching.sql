-- Safer chargeback → commercial matching.
--
-- Before: for a CPE the function picked the most-recent sale (ORDER BY created_at
-- DESC LIMIT 1) and validated the client with a fuzzy 6-letter substring. That
-- could attribute an estorno to the WRONG commercial (CPE reused across sales /
-- different sellers) and produced false client mismatches.
--
-- Now: a CPE is matched only when all its completed sales belong to a SINGLE
-- commercial. If the CPE spans sales of different commercials it is left
-- unmatched ("confirmar manualmente") instead of guessed. The fragile fuzzy
-- client-name check is removed (the CPE is the strong identifier).
--
-- Both overloads (with and without p_reference_month) are recreated, since the
-- frontend may call either.

-- ── Overload WITHOUT reference_month ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.import_commission_chargebacks(
  p_organization_id uuid, p_file_name text, p_cpe_column_name text, p_rows jsonb)
 RETURNS TABLE(import_id uuid, total_rows integer, chargeback_count integer, matched_rows integer, unmatched_rows integer, total_chargeback_amount numeric)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_import_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN RAISE EXCEPTION 'Not allowed for this organization'; END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN RAISE EXCEPTION 'At least one row is required'; END IF;

  INSERT INTO public.commission_chargeback_imports (organization_id, imported_by, file_name, cpe_column_name)
  VALUES (p_organization_id, auth.uid(), COALESCE(NULLIF(trim(p_file_name), ''), 'chargebacks'), p_cpe_column_name)
  RETURNING id INTO v_import_id;

  WITH parsed_rows AS (
    SELECT ord::integer AS row_index, obj AS raw_row,
      COALESCE(obj ->> 'cpe', '') AS cpe,
      public.normalize_chargeback_cpe(obj ->> 'cpe') AS normalized_cpe,
      CASE WHEN jsonb_typeof(obj -> 'chargeback_amount') = 'number' THEN COALESCE((obj ->> 'chargeback_amount')::numeric, 0)
           ELSE public.parse_chargeback_amount(obj ->> 'chargeback_amount') END AS chargeback_amount
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS t(obj, ord)
  ),
  matched_rows_cte AS (
    SELECT pr.*, ml.matched_proposal_cpe_id, ml.matched_proposal_id, ml.matched_sale_id, ml.matched_user_id,
      CASE
        WHEN pr.normalized_cpe IS NULL THEN 'CPE invalido'
        WHEN COALESCE(ml.sale_count, 0) = 0 THEN 'CPE nao encontrado'
        WHEN ml.user_count > 1 THEN 'CPE em vendas de comerciais diferentes (confirmar manualmente)'
        WHEN ml.matched_user_id IS NULL THEN 'Sem comercial associado'
        ELSE NULL
      END AS unmatched_reason
    FROM parsed_rows pr
    LEFT JOIN LATERAL (
      SELECT
        (array_agg(x.matched_proposal_cpe_id ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_proposal_cpe_id,
        (array_agg(x.matched_proposal_id   ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_proposal_id,
        (array_agg(x.matched_sale_id       ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_sale_id,
        (array_agg(x.matched_user_id       ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_user_id,
        count(*) AS sale_count,
        count(DISTINCT x.matched_user_id) AS user_count
      FROM (
        SELECT pc.id AS matched_proposal_cpe_id, pc.proposal_id AS matched_proposal_id, s.id AS matched_sale_id,
               COALESCE(cc.assigned_to, l.assigned_to, s.created_by, p.created_by) AS matched_user_id, s.created_at
        FROM public.proposal_cpes pc
        JOIN public.proposals p ON p.id = pc.proposal_id
        JOIN public.sales s ON s.proposal_id = p.id AND s.organization_id = p_organization_id
        LEFT JOIN public.crm_clients cc ON cc.id = s.client_id
        LEFT JOIN public.leads l ON l.id = COALESCE(s.lead_id, p.lead_id)
        WHERE p.organization_id = p_organization_id
          AND public.normalize_chargeback_cpe(pc.serial_number) = pr.normalized_cpe
          AND s.status IN ('concluida','entregue','Concluída','Entregue','concluded','delivered')
      ) x
    ) AS ml ON true
  )
  INSERT INTO public.commission_chargeback_items (organization_id, import_id, row_index, cpe, normalized_cpe, chargeback_amount, matched, matched_proposal_cpe_id, matched_proposal_id, matched_sale_id, matched_user_id, unmatched_reason, raw_row)
  SELECT p_organization_id, v_import_id, mr.row_index, mr.cpe, mr.normalized_cpe, mr.chargeback_amount,
    (mr.unmatched_reason IS NULL AND mr.matched_user_id IS NOT NULL),
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_proposal_cpe_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_proposal_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_sale_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_user_id END,
    mr.unmatched_reason, mr.raw_row
  FROM matched_rows_cte mr;

  UPDATE public.commission_chargeback_imports imp
  SET total_rows = s.total, matched_rows = s.matched, unmatched_rows = s.unmatched, chargeback_count = s.cb_count, total_chargeback_amount = s.cb_total
  FROM (SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ci.matched) AS matched, COUNT(*) FILTER (WHERE NOT ci.matched) AS unmatched,
               COUNT(*) FILTER (WHERE ci.chargeback_amount <> 0) AS cb_count, COALESCE(SUM(ci.chargeback_amount), 0) AS cb_total
        FROM public.commission_chargeback_items ci WHERE ci.import_id = v_import_id) s
  WHERE imp.id = v_import_id;

  RETURN QUERY SELECT imp.id, imp.total_rows, imp.chargeback_count, imp.matched_rows, imp.unmatched_rows, imp.total_chargeback_amount
  FROM public.commission_chargeback_imports imp WHERE imp.id = v_import_id;
END;
$function$;

-- ── Overload WITH reference_month ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.import_commission_chargebacks(
  p_organization_id uuid, p_file_name text, p_cpe_column_name text, p_rows jsonb, p_reference_month date DEFAULT NULL::date)
 RETURNS TABLE(import_id uuid, total_rows integer, chargeback_count integer, matched_rows integer, unmatched_rows integer, total_chargeback_amount numeric)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_import_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN RAISE EXCEPTION 'Not allowed for this organization'; END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN RAISE EXCEPTION 'At least one row is required'; END IF;

  INSERT INTO public.commission_chargeback_imports (organization_id, imported_by, file_name, cpe_column_name, reference_month)
  VALUES (p_organization_id, auth.uid(), COALESCE(NULLIF(trim(p_file_name), ''), 'chargebacks'), p_cpe_column_name, p_reference_month)
  RETURNING id INTO v_import_id;

  WITH parsed_rows AS (
    SELECT ord::integer AS row_index, obj AS raw_row,
      COALESCE(obj ->> 'cpe', '') AS cpe,
      public.normalize_chargeback_cpe(obj ->> 'cpe') AS normalized_cpe,
      CASE WHEN jsonb_typeof(obj -> 'chargeback_amount') = 'number' THEN COALESCE((obj ->> 'chargeback_amount')::numeric, 0)
           ELSE public.parse_chargeback_amount(obj ->> 'chargeback_amount') END AS chargeback_amount
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS t(obj, ord)
  ),
  matched_rows_cte AS (
    SELECT pr.*, ml.matched_proposal_cpe_id, ml.matched_proposal_id, ml.matched_sale_id, ml.matched_user_id,
      CASE
        WHEN pr.normalized_cpe IS NULL THEN 'CPE invalido'
        WHEN COALESCE(ml.sale_count, 0) = 0 THEN 'CPE nao encontrado'
        WHEN ml.user_count > 1 THEN 'CPE em vendas de comerciais diferentes (confirmar manualmente)'
        WHEN ml.matched_user_id IS NULL THEN 'Sem comercial associado'
        ELSE NULL
      END AS unmatched_reason
    FROM parsed_rows pr
    LEFT JOIN LATERAL (
      SELECT
        (array_agg(x.matched_proposal_cpe_id ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_proposal_cpe_id,
        (array_agg(x.matched_proposal_id   ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_proposal_id,
        (array_agg(x.matched_sale_id       ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_sale_id,
        (array_agg(x.matched_user_id       ORDER BY x.created_at DESC NULLS LAST))[1] AS matched_user_id,
        count(*) AS sale_count,
        count(DISTINCT x.matched_user_id) AS user_count
      FROM (
        SELECT pc.id AS matched_proposal_cpe_id, pc.proposal_id AS matched_proposal_id, s.id AS matched_sale_id,
               COALESCE(cc.assigned_to, l.assigned_to, s.created_by, p.created_by) AS matched_user_id, s.created_at
        FROM public.proposal_cpes pc
        JOIN public.proposals p ON p.id = pc.proposal_id
        JOIN public.sales s ON s.proposal_id = p.id AND s.organization_id = p_organization_id
        LEFT JOIN public.crm_clients cc ON cc.id = s.client_id
        LEFT JOIN public.leads l ON l.id = COALESCE(s.lead_id, p.lead_id)
        WHERE p.organization_id = p_organization_id
          AND public.normalize_chargeback_cpe(pc.serial_number) = pr.normalized_cpe
          AND s.status IN ('concluida','entregue','Concluída','Entregue','concluded','delivered')
      ) x
    ) AS ml ON true
  )
  INSERT INTO public.commission_chargeback_items (organization_id, import_id, row_index, cpe, normalized_cpe, chargeback_amount, matched, matched_proposal_cpe_id, matched_proposal_id, matched_sale_id, matched_user_id, unmatched_reason, raw_row)
  SELECT p_organization_id, v_import_id, mr.row_index, mr.cpe, mr.normalized_cpe, mr.chargeback_amount,
    (mr.unmatched_reason IS NULL AND mr.matched_user_id IS NOT NULL),
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_proposal_cpe_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_proposal_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_sale_id END,
    CASE WHEN mr.unmatched_reason IS NULL THEN mr.matched_user_id END,
    mr.unmatched_reason, mr.raw_row
  FROM matched_rows_cte mr;

  UPDATE public.commission_chargeback_imports imp
  SET total_rows = s.total, matched_rows = s.matched, unmatched_rows = s.unmatched, chargeback_count = s.cb_count, total_chargeback_amount = s.cb_total
  FROM (SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ci.matched) AS matched, COUNT(*) FILTER (WHERE NOT ci.matched) AS unmatched,
               COUNT(*) FILTER (WHERE ci.chargeback_amount <> 0) AS cb_count, COALESCE(SUM(ci.chargeback_amount), 0) AS cb_total
        FROM public.commission_chargeback_items ci WHERE ci.import_id = v_import_id) s
  WHERE imp.id = v_import_id;

  RETURN QUERY SELECT imp.id, imp.total_rows, imp.chargeback_count, imp.matched_rows, imp.unmatched_rows, imp.total_chargeback_amount
  FROM public.commission_chargeback_imports imp WHERE imp.id = v_import_id;
END;
$function$;
