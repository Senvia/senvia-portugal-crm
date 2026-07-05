-- ============================================================
-- DADOS FICTÍCIOS — Telecom Demo Pro
-- Para gravar vídeos de demonstração do Senvia OS
--
-- Como usar:
--   1. Abrir Supabase Dashboard > SQL Editor
--   2. Colar este script e executar
--   3. Se quiser apagar tudo e recomeçar, usar o bloco
--      "LIMPEZA" no final do ficheiro
-- ============================================================

DO $$
DECLARE
  v_org_id   uuid;
  v_user_id  uuid;

  -- Product UUIDs
  p_fibra_200  uuid := gen_random_uuid();
  p_fibra_500  uuid := gen_random_uuid();
  p_fibra_1g   uuid := gen_random_uuid();
  p_tel_fixo   uuid := gen_random_uuid();
  p_tel_10     uuid := gen_random_uuid();
  p_tel_30     uuid := gen_random_uuid();
  p_cent_5     uuid := gen_random_uuid();
  p_cent_20    uuid := gen_random_uuid();
  p_tv_box     uuid := gen_random_uuid();
  p_pack_biz   uuid := gen_random_uuid();
  p_install    uuid := gen_random_uuid();
  p_suporte    uuid := gen_random_uuid();

  -- Client UUIDs
  c1  uuid := gen_random_uuid();
  c2  uuid := gen_random_uuid();
  c3  uuid := gen_random_uuid();
  c4  uuid := gen_random_uuid();
  c5  uuid := gen_random_uuid();
  c6  uuid := gen_random_uuid();
  c7  uuid := gen_random_uuid();
  c8  uuid := gen_random_uuid();
  c9  uuid := gen_random_uuid();
  c10 uuid := gen_random_uuid();

  -- Expense category UUIDs
  cat_infra  uuid := gen_random_uuid();
  cat_mkt    uuid := gen_random_uuid();
  cat_pes    uuid := gen_random_uuid();
  cat_forn   uuid := gen_random_uuid();
  cat_soft   uuid := gen_random_uuid();
  cat_viag   uuid := gen_random_uuid();
  cat_mat    uuid := gen_random_uuid();

  -- Lead UUIDs
  lead1  uuid := gen_random_uuid();
  lead2  uuid := gen_random_uuid();
  lead3  uuid := gen_random_uuid();
  lead4  uuid := gen_random_uuid();
  lead5  uuid := gen_random_uuid();
  lead6  uuid := gen_random_uuid();
  lead7  uuid := gen_random_uuid();
  lead8  uuid := gen_random_uuid();
  lead9  uuid := gen_random_uuid();
  lead10 uuid := gen_random_uuid();
  lead11 uuid := gen_random_uuid();
  lead12 uuid := gen_random_uuid();
  lead13 uuid := gen_random_uuid();
  lead14 uuid := gen_random_uuid();
  lead15 uuid := gen_random_uuid();

  -- Sale UUIDs
  sale1  uuid := gen_random_uuid();
  sale2  uuid := gen_random_uuid();
  sale3  uuid := gen_random_uuid();
  sale4  uuid := gen_random_uuid();
  sale5  uuid := gen_random_uuid();
  sale6  uuid := gen_random_uuid();
  sale7  uuid := gen_random_uuid();
  sale8  uuid := gen_random_uuid();
  sale9  uuid := gen_random_uuid();
  sale10 uuid := gen_random_uuid();

  -- Proposal UUIDs
  prop1 uuid := gen_random_uuid();
  prop2 uuid := gen_random_uuid();

BEGIN
  -- ──────────────────────────────────────────────
  -- 0. ENCONTRAR ORG
  -- ──────────────────────────────────────────────
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name ILIKE '%telecom%'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organização com "telecom" no nome não encontrada. Verifica o nome exacto.';
  END IF;

  SELECT user_id INTO v_user_id
  FROM organization_members
  WHERE organization_id = v_org_id
  LIMIT 1;

  -- Fallback: buscar pelo profiles se não houver organization_members
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE organization_id = v_org_id
    LIMIT 1;
  END IF;

  -- Último recurso: qualquer super_admin
  IF v_user_id IS NULL THEN
    SELECT ur.user_id INTO v_user_id
    FROM user_roles ur
    WHERE ur.role = 'super_admin'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Org ID: % | User ID: %', v_org_id, v_user_id;

  -- ──────────────────────────────────────────────
  -- 1. PIPELINE STAGES
  -- ──────────────────────────────────────────────
  INSERT INTO pipeline_stages
    (organization_id, name, key, color, position, is_final_positive, is_final_negative)
  VALUES
    (v_org_id, 'Novo',       'new',       '#3B82F6', 1, false, false),
    (v_org_id, 'Contactado', 'contacted', '#A855F7', 2, false, false),
    (v_org_id, 'Agendado',   'scheduled', '#F59E0B', 3, false, false),
    (v_org_id, 'Proposta',   'proposal',  '#06B6D4', 4, false, false),
    (v_org_id, 'Ganho',      'won',       '#22C55E', 5, true,  false),
    (v_org_id, 'Perdido',    'lost',      '#6B7280', 6, false, true)
  ON CONFLICT (organization_id, key) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 2. CATEGORIAS DE DESPESA
  -- ──────────────────────────────────────────────
  INSERT INTO expense_categories (id, organization_id, name, color)
  VALUES
    (cat_infra, v_org_id, 'Infraestrutura de Rede',     '#3B82F6'),
    (cat_mkt,   v_org_id, 'Marketing e Publicidade',    '#EC4899'),
    (cat_pes,   v_org_id, 'Pessoal e RH',               '#8B5CF6'),
    (cat_forn,  v_org_id, 'Fornecedores e Parceiros',   '#F59E0B'),
    (cat_soft,  v_org_id, 'Software e Licenças',        '#06B6D4'),
    (cat_viag,  v_org_id, 'Viagens e Deslocações',      '#10B981'),
    (cat_mat,   v_org_id, 'Material de Escritório',     '#6366F1');

  -- ──────────────────────────────────────────────
  -- 3. PRODUTOS / SERVIÇOS
  -- ──────────────────────────────────────────────
  INSERT INTO products
    (id, organization_id, name, description, price, is_active, is_recurring, tax_value, code)
  VALUES
    (p_fibra_200, v_org_id, 'Internet Fibra 200Mbps',
      'Fibra óptica simétrica 200Mbps, ideal para pequenas empresas',
      29.99, true, true, 23, 'INT-F200'),

    (p_fibra_500, v_org_id, 'Internet Fibra 500Mbps',
      'Fibra óptica simétrica 500Mbps, para empresas exigentes',
      39.99, true, true, 23, 'INT-F500'),

    (p_fibra_1g, v_org_id, 'Internet Fibra 1Gbps',
      'Fibra óptica simétrica 1Gbps, alta performance garantida',
      59.99, true, true, 23, 'INT-F1G'),

    (p_tel_fixo, v_org_id, 'Telefone Fixo Ilimitado',
      'Chamadas ilimitadas para rede fixa nacional',
      9.99, true, true, 23, 'TEL-FX'),

    (p_tel_10, v_org_id, 'Telemóvel 10GB + Chamadas',
      'Plano telemóvel com 10GB de dados + chamadas ilimitadas',
      14.99, true, true, 23, 'TEL-M10'),

    (p_tel_30, v_org_id, 'Telemóvel 30GB + Chamadas',
      'Plano telemóvel com 30GB de dados + chamadas ilimitadas',
      24.99, true, true, 23, 'TEL-M30'),

    (p_cent_5, v_org_id, 'Centralita Virtual 5 Ramais',
      'Centralita VOIP em cloud com 5 ramais incluídos',
      49.99, true, true, 23, 'CENT-5R'),

    (p_cent_20, v_org_id, 'Centralita Virtual 20 Ramais',
      'Centralita VOIP em cloud com 20 ramais incluídos',
      89.99, true, true, 23, 'CENT-20R'),

    (p_tv_box, v_org_id, 'TV Box Premium',
      'Televisão por cabo com mais de 100 canais HD incluídos',
      14.99, true, true, 23, 'TV-PREM'),

    (p_pack_biz, v_org_id, 'Pack Business Completo',
      'Fibra 500Mbps + Telefone Fixo + Centralita 5 Ramais + TV Box',
      89.99, true, true, 23, 'PACK-BIZ'),

    (p_install, v_org_id, 'Instalação e Activação',
      'Serviço de instalação técnica e activação no local do cliente',
      75.00, true, false, 23, 'INST-ACT'),

    (p_suporte, v_org_id, 'Suporte Técnico Prioritário',
      'Suporte 24/7 com SLA prioritário e gestor de conta dedicado',
      19.99, true, true, 23, 'SUPT-PRIO');

  -- ──────────────────────────────────────────────
  -- 4. CLIENTES CRM
  -- ──────────────────────────────────────────────
  INSERT INTO crm_clients
    (id, organization_id, name, email, phone, company, nif,
     source, notes, status, total_sales, total_value)
  VALUES
    (c1,  v_org_id, 'Restaurante O Cantinho, Lda',
      'geral@ocantinho.pt', '+351 220 123 456',
      'Restaurante O Cantinho, Lda', '501234567',
      'Referência', 'Cliente desde 2024. Pack Business activo. Muito satisfeito com o serviço.',
      'active', 1, 89.99),

    (c2,  v_org_id, 'Auto Peças Ferreira & Filhos',
      'geral@autopecasferreira.pt', '+351 222 345 678',
      'Auto Peças Ferreira & Filhos, Lda', '502345678',
      'Website', 'Empresa familiar com 3 localidades. Fibra 1G + Centralita 20R no armazém central.',
      'active', 1, 299.95),

    (c3,  v_org_id, 'Clínica Dental Sorrisos',
      'info@clinicasorrisos.pt', '+351 223 456 789',
      'Clínica Dental Sorrisos, Lda', '503456789',
      'Google Ads', 'Clínica com alta exigência de uptime. Instalação em curso.',
      'active', 1, 164.99),

    (c4,  v_org_id, 'Supermercado O Frescal',
      'geral@ofrescal.pt', '+351 224 567 890',
      'O Frescal - Comércio Alimentar, Lda', '504567890',
      'Referência', 'Fibra 500 + Centralita 5R + Suporte prioritário. Cliente fidelizado.',
      'active', 1, 254.95),

    (c5,  v_org_id, 'Oficina Mecânica Santos',
      'oficina@mecanicasantos.pt', '+351 225 678 901',
      'Mecânica Santos, Lda', '505678901',
      'Instagram', 'Pequena oficina, fibra básica + fixo. Potencial para upsell centralita.',
      'active', 1, 114.97),

    (c6,  v_org_id, 'Hotel Praia Dourada',
      'reservas@praiadourada.pt', '+351 226 789 012',
      'Hotel Praia Dourada, SA', '506789012',
      'Google Ads', 'Hotel 4 estrelas, 80 quartos. Fibra 1G + TV em todos os quartos + Centralita 20R.',
      'active', 1, 409.93),

    (c7,  v_org_id, 'Farmácia Central do Porto',
      'farmacia@centralporto.pt', '+351 227 890 123',
      'Farmácia Central do Porto, Lda', '507890123',
      'Referência', 'Farmácia com 2 balcões. Pack Business x2 + Suporte prioritário. Cliente VIP.',
      'active', 1, 294.97),

    (c8,  v_org_id, 'Imobiliária Norte & Sul',
      'geral@nortesul.pt', '+351 228 901 234',
      'Norte e Sul Imobiliária, Lda', '508901234',
      'Facebook Ads', 'Agência imobiliária com 8 colaboradores. Instalação hoje.',
      'active', 1, 164.99),

    (c9,  v_org_id, 'Academia FitLife',
      'fitlife@academia.pt', '+351 229 012 345',
      'FitLife Academia de Fitness, Lda', '509012345',
      'Instagram', 'Academia com sistema de marcações por telefone. Venda confirmada, aguarda instalação.',
      'active', 1, 204.97),

    (c10, v_org_id, 'Pastelaria Bom Dia',
      'bomdiacafe@gmail.com', '+351 221 123 456',
      'Bom Dia Café & Pastelaria, Lda', '510123456',
      'Campanha Email', 'Pequena pastelaria, pacote básico de entrada. Primeiro serviço.',
      'active', 1, 104.99);

  -- ──────────────────────────────────────────────
  -- 5. LEADS
  -- ──────────────────────────────────────────────
  INSERT INTO leads
    (id, organization_id, name, email, phone, company_name,
     status, source, value, notes, gdpr_consent, created_at)
  VALUES
    -- NOVOS
    (lead1, v_org_id, 'Miguel Santos', 'miguel.santos@techstart.pt',
      '+351 912 345 678', 'TechStart Lisboa, Lda',
      'new', 'Website', 1500.00,
      'Interessado em pack business completo para escritório de 15 pessoas. Pediu proposta detalhada.',
      true, now() - interval '2 days'),

    (lead2, v_org_id, 'Ana Ferreira', 'ana.ferreira@cafemanteigas.pt',
      '+351 913 456 789', 'Café Manteiga de Porco, Lda',
      'new', 'Instagram', 400.00,
      'Pequeno café no centro. Fibra básica + fixo. Lead pelo Instagram.',
      true, now() - interval '1 day'),

    (lead3, v_org_id, 'Carlos Rodrigues', 'carlos@logisticorp.pt',
      '+351 914 567 890', 'Logisticorp Portugal, SA',
      'new', 'Google Ads', 3200.00,
      'Empresa de logística com 3 armazéns. Precisa de infraestrutura completa para cada unidade.',
      true, now() - interval '4 hours'),

    -- CONTACTADOS
    (lead4, v_org_id, 'Sofia Mendes', 'sofia.mendes@clinicavital.pt',
      '+351 915 678 901', 'Clínica Vital, Lda',
      'contacted', 'Referência', 800.00,
      'Contactada a 13/06 por telefone. Interessada em centralita + fibra. Aguarda proposta formal.',
      true, now() - interval '5 days'),

    (lead5, v_org_id, 'Pedro Oliveira', 'pedro@construcoesnovais.pt',
      '+351 916 789 012', 'Construções Novais, Lda',
      'contacted', 'Facebook Ads', 600.00,
      'Empresa de construção civil. Contactado 11/06. Quer TV + fibra para escritório sede.',
      true, now() - interval '4 days'),

    -- AGENDADOS
    (lead6, v_org_id, 'Marta Lima', 'marta.lima@restaurantemar.pt',
      '+351 917 890 123', 'Restaurante Mar e Sol, Lda',
      'scheduled', 'Referência', 1100.00,
      'Reunião marcada para 18/06 às 14h00 no restaurante. Pack business para restaurante de luxo.',
      true, now() - interval '7 days'),

    (lead7, v_org_id, 'João Pereira', 'joao@escritoriopereira.pt',
      '+351 918 901 234', 'Escritório Pereira & Associados',
      'scheduled', 'Google Ads', 950.00,
      'Escritório de advogados, reunião a 20/06. Precisa de linha dedicada + suporte prioritário.',
      true, now() - interval '6 days'),

    -- PROPOSTA ENVIADA
    (lead8, v_org_id, 'Filipa Costa', 'filipa@hotelcosta.pt',
      '+351 919 012 345', 'Hotel Costa Azul, Lda',
      'proposal', 'Website', 2800.00,
      'Proposta enviada a 10/06. Hotel 3 estrelas, 45 quartos. Aguarda aprovação da gerência.',
      true, now() - interval '10 days'),

    (lead9, v_org_id, 'Rui Gonçalves', 'rui@supergonc.pt',
      '+351 920 123 456', 'Supermercado Gonçalves, Lda',
      'proposal', 'Campanha Email', 1600.00,
      'Proposta enviada a 08/06. 2 lojas, centralita 20R por loja. Decisão pendente.',
      true, now() - interval '12 days'),

    -- GANHOS
    (lead10, v_org_id, 'Teresa Alves', 'teresa@salaoalves.pt',
      '+351 921 234 567', 'Salão de Beleza Alves, Lda',
      'won', 'Instagram', 500.00,
      'Lead convertida. Pack fibra 200 + fixo. Activação realizada a 05/06. Cliente muito satisfeita.',
      true, now() - interval '20 days'),

    (lead11, v_org_id, 'Nuno Martins', 'nuno@garagemsuperior.pt',
      '+351 922 345 678', 'Garagem Superior, Lda',
      'won', 'Referência', 1200.00,
      'Lead convertida. Centralita 5R + fibra 500. Instalação concluída. Avaliação 5 estrelas.',
      true, now() - interval '25 days'),

    (lead12, v_org_id, 'Andreia Silva', 'andreia@guarderiasol.pt',
      '+351 923 456 789', 'Creche Sol Nascente, Lda',
      'won', 'Facebook Ads', 750.00,
      'Lead convertida. Pack business. Instalação realizada a 01/06. Em renovação activa.',
      true, now() - interval '30 days'),

    -- PERDIDOS
    (lead13, v_org_id, 'Bruno Faria', 'bruno@oficinafaria.pt',
      '+351 924 567 890', 'Oficina Faria, Lda',
      'lost', 'Google Ads', 300.00,
      'Perdido para concorrente (NOS). Preço foi o factor decisivo. Rever pricing para PMEs.',
      true, now() - interval '15 days'),

    (lead14, v_org_id, 'Catarina Moura', 'catarina@librariasabe.pt',
      '+351 925 678 901', 'Livraria Sabe Tudo, Lda',
      'lost', 'Website', 200.00,
      'Cliente desistiu. Mudou o espaço físico e não precisou do serviço por agora.',
      true, now() - interval '18 days'),

    (lead15, v_org_id, 'Hugo Teixeira', 'hugo@transportesteixeira.pt',
      '+351 926 789 012', 'Transportes Teixeira, SA',
      'lost', 'Referência', 900.00,
      'Perdido. Optou por solução in-house com linha dedicada própria. Possível reactivação em 2027.',
      true, now() - interval '22 days');

  -- ──────────────────────────────────────────────
  -- 6. VENDAS + ITENS + PAGAMENTOS
  -- ──────────────────────────────────────────────

  -- VENDA 1 — Restaurante O Cantinho — Delivered — Pack Business
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale1, v_org_id, c1, 'delivered', 164.99,
    'transfer', true, 89.99, 'active',
    (now() + interval '15 days')::date,
    (now() - interval '15 days')::date,
    (now() - interval '30 days')::date,
    'Pack Business + Instalação. Cliente muito satisfeito com a qualidade da fibra.',
    'VND-2024-001', v_user_id, now() - interval '35 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale1, p_pack_biz, 'Pack Business Completo', 1, 89.99, 89.99),
    (sale1, p_install,  'Instalação e Activação',  1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale1, 75.00, (now() - interval '30 days')::date, 'transfer', 'paid',  'Instalação paga na assinatura'),
    (v_org_id, sale1, 89.99, (now() - interval '15 days')::date, 'transfer', 'paid',  'Primeira mensalidade');

  -- VENDA 2 — Auto Peças Ferreira — Delivered — Fibra 1G + Centralita 20R + extras
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale2, v_org_id, c2, 'delivered', 299.95,
    'transfer', true, 149.97, 'active',
    (now() + interval '10 days')::date,
    (now() - interval '20 days')::date,
    (now() - interval '45 days')::date,
    'Fibra 1G para armazém central + Centralita 20R + Suporte + TV Box. 3 localizações cobertas.',
    'VND-2024-002', v_user_id, now() - interval '50 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale2, p_fibra_1g, 'Internet Fibra 1Gbps',            1, 59.99, 59.99),
    (sale2, p_cent_20,  'Centralita Virtual 20 Ramais',     1, 89.99, 89.99),
    (sale2, p_tel_fixo, 'Telefone Fixo Ilimitado',          2,  9.99, 19.98),
    (sale2, p_suporte,  'Suporte Técnico Prioritário',      1, 19.99, 19.99),
    (sale2, p_tv_box,   'TV Box Premium',                   1, 14.99, 14.99),
    (sale2, p_install,  'Instalação e Activação',           1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale2, 75.00,  (now() - interval '45 days')::date, 'transfer', 'paid', 'Instalação'),
    (v_org_id, sale2, 224.95, (now() - interval '20 days')::date, 'transfer', 'paid', 'Mensalidade (1ª)'),
    (v_org_id, sale2, 149.97, now()::date,                        'transfer', 'paid', 'Mensalidade (2ª)');

  -- VENDA 3 — Clínica Dental Sorrisos — In Progress — Pack Business
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale3, v_org_id, c3, 'in_progress', 164.99,
    'mbway', true, 89.99, 'active',
    (now() + interval '25 days')::date,
    (now() - interval '5 days')::date,
    'Pack Business em instalação. Técnico agendado para amanhã às 9h.',
    'VND-2024-003', v_user_id, now() - interval '10 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale3, p_pack_biz, 'Pack Business Completo', 1, 89.99, 89.99),
    (sale3, p_install,  'Instalação e Activação',  1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale3, 75.00, (now() - interval '5 days')::date, 'mbway', 'paid',    'Entrada instalação paga'),
    (v_org_id, sale3, 89.99, (now() + interval '25 days')::date,'mbway', 'pending', 'Primeira mensalidade');

  -- VENDA 4 — Supermercado O Frescal — Fulfilled — Fibra 500 + Centralita 5R + extras
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale4, v_org_id, c4, 'fulfilled', 254.95,
    'transfer', true, 99.97, 'active',
    (now() + interval '5 days')::date,
    (now() - interval '25 days')::date,
    (now() - interval '60 days')::date,
    'Fibra 500 + Centralita 5R + Suporte + TV Box + Fixo. Renovação activa há 2 meses.',
    'VND-2024-004', v_user_id, now() - interval '65 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale4, p_fibra_500, 'Internet Fibra 500Mbps',       1, 39.99, 39.99),
    (sale4, p_cent_5,    'Centralita Virtual 5 Ramais',  1, 49.99, 49.99),
    (sale4, p_suporte,   'Suporte Técnico Prioritário',  1, 19.99, 19.99),
    (sale4, p_tel_fixo,  'Telefone Fixo Ilimitado',      1,  9.99,  9.99),
    (sale4, p_tv_box,    'TV Box Premium',               1, 14.99, 14.99),
    (sale4, p_install,   'Instalação e Activação',       1, 75.00, 75.00),
    (sale4, p_tel_10,    'Telemóvel 10GB + Chamadas',    2, 14.99, 29.98),
    (sale4, p_tel_30,    'Telemóvel 30GB + Chamadas',    1, 24.99, 24.99);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale4, 75.00,  (now() - interval '60 days')::date, 'transfer', 'paid', 'Instalação'),
    (v_org_id, sale4, 179.95, (now() - interval '25 days')::date, 'transfer', 'paid', 'Mensalidade (1ª)'),
    (v_org_id, sale4, 99.97,  (now() + interval '5 days')::date,  'transfer', 'pending', 'Mensalidade (2ª)');

  -- VENDA 5 — Oficina Mecânica Santos — Delivered — Fibra 200 + Fixo
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale5, v_org_id, c5, 'delivered', 114.97,
    'mbway', true, 39.98, 'active',
    (now() + interval '8 days')::date,
    (now() - interval '22 days')::date,
    (now() - interval '55 days')::date,
    'Fibra 200 + Fixo. Instalação simples. Cliente satisfeito, potencial para upsell centralita.',
    'VND-2024-005', v_user_id, now() - interval '60 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale5, p_fibra_200, 'Internet Fibra 200Mbps',  1, 29.99, 29.99),
    (sale5, p_tel_fixo,  'Telefone Fixo Ilimitado', 1,  9.99,  9.99),
    (sale5, p_install,   'Instalação e Activação',  1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale5, 75.00, (now() - interval '55 days')::date, 'mbway', 'paid', 'Instalação'),
    (v_org_id, sale5, 39.98, (now() - interval '22 days')::date, 'mbway', 'paid', 'Mensalidade (1ª)');

  -- VENDA 6 — Hotel Praia Dourada — Delivered — Fibra 1G + TV x3 + Centralita 20R + Suporte
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale6, v_org_id, c6, 'delivered', 409.93,
    'transfer', true, 184.96, 'active',
    (now() + interval '12 days')::date,
    (now() - interval '18 days')::date,
    (now() - interval '40 days')::date,
    'Solução completa para hotel. Backbone 1G + TV nos quartos + Centralita 20R + Suporte VIP.',
    'VND-2024-006', v_user_id, now() - interval '45 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale6, p_fibra_1g,  'Internet Fibra 1Gbps',          1,  59.99,  59.99),
    (sale6, p_cent_20,   'Centralita Virtual 20 Ramais',  1,  89.99,  89.99),
    (sale6, p_tv_box,    'TV Box Premium',                3,  14.99,  44.97),
    (sale6, p_suporte,   'Suporte Técnico Prioritário',   1,  19.99,  19.99),
    (sale6, p_install,   'Instalação e Activação',        3,  75.00, 225.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale6, 225.00, (now() - interval '40 days')::date, 'transfer', 'paid',    'Instalações (3 pontos)'),
    (v_org_id, sale6, 184.96, (now() - interval '18 days')::date, 'transfer', 'paid',    'Mensalidade (1ª)'),
    (v_org_id, sale6, 184.96, (now() + interval '12 days')::date, 'transfer', 'pending', 'Mensalidade (2ª)');

  -- VENDA 7 — Farmácia Central do Porto — Fulfilled — Pack Business x2 + Suporte
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, last_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale7, v_org_id, c7, 'fulfilled', 294.97,
    'transfer', true, 179.98, 'active',
    (now() + interval '3 days')::date,
    (now() - interval '27 days')::date,
    (now() - interval '65 days')::date,
    'Pack Business para 2 balcões + Suporte prioritário. Cliente VIP, gestor de conta dedicado.',
    'VND-2024-007', v_user_id, now() - interval '70 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale7, p_pack_biz, 'Pack Business Completo',      2,  89.99, 179.98),
    (sale7, p_suporte,  'Suporte Técnico Prioritário', 1,  19.99,  19.99),
    (sale7, p_install,  'Instalação e Activação',      2,  75.00, 150.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale7, 150.00, (now() - interval '65 days')::date, 'transfer', 'paid',    'Instalações 2 balcões'),
    (v_org_id, sale7, 179.98, (now() - interval '27 days')::date, 'transfer', 'paid',    'Mensalidade (1ª)'),
    (v_org_id, sale7, 179.98, (now() + interval '3 days')::date,  'transfer', 'pending', 'Mensalidade (2ª)');

  -- VENDA 8 — Imobiliária Norte & Sul — In Progress — Pack Business
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     next_renewal_date, activation_date,
     notes, code, created_by, created_at)
  VALUES (
    sale8, v_org_id, c8, 'in_progress', 164.99,
    'card', true, 89.99, 'active',
    (now() + interval '28 days')::date,
    now()::date,
    'Instalação a decorrer hoje. Técnico no local desde as 10h.',
    'VND-2024-008', v_user_id, now() - interval '3 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale8, p_pack_biz, 'Pack Business Completo', 1, 89.99, 89.99),
    (sale8, p_install,  'Instalação e Activação',  1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale8, 75.00, now()::date,                        'card', 'paid',    'Instalação paga hoje no local'),
    (v_org_id, sale8, 89.99, (now() + interval '28 days')::date, 'card', 'pending', 'Primeira mensalidade');

  -- VENDA 9 — Academia FitLife — Pending — Fibra 500 + Centralita 5R + Telemóvel 30
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     notes, code, created_by, created_at)
  VALUES (
    sale9, v_org_id, c9, 'pending', 204.97,
    'mbway', true, 104.96, 'active',
    'Venda confirmada, a aguardar agendamento da instalação.',
    'VND-2024-009', v_user_id, now() - interval '1 day'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale9, p_fibra_500, 'Internet Fibra 500Mbps',      1, 39.99, 39.99),
    (sale9, p_cent_5,    'Centralita Virtual 5 Ramais', 1, 49.99, 49.99),
    (sale9, p_tel_30,    'Telemóvel 30GB + Chamadas',   1, 24.99, 24.99),
    (sale9, p_suporte,   'Suporte Técnico Prioritário', 1, 19.99, 19.99),
    (sale9, p_install,   'Instalação e Activação',      1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale9, 75.00,  (now() + interval '7 days')::date,  'mbway', 'pending', 'Instalação - aguarda data'),
    (v_org_id, sale9, 129.97, (now() + interval '37 days')::date, 'mbway', 'pending', 'Primeira mensalidade');

  -- VENDA 10 — Pastelaria Bom Dia — Pending — Fibra 200 básica
  INSERT INTO sales
    (id, organization_id, client_id, status, total_value,
     payment_method, has_recurring, recurring_value, recurring_status,
     notes, code, created_by, created_at)
  VALUES (
    sale10, v_org_id, c10, 'pending', 104.99,
    'cash', true, 29.99, 'active',
    'Primeiro cliente por campanha de email. Pacote básico, boa oportunidade de crescimento futuro.',
    'VND-2024-010', v_user_id, now() - interval '2 days'
  );
  INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, total)
  VALUES
    (sale10, p_fibra_200, 'Internet Fibra 200Mbps', 1, 29.99, 29.99),
    (sale10, p_install,   'Instalação e Activação', 1, 75.00, 75.00);
  INSERT INTO sale_payments
    (organization_id, sale_id, amount, payment_date, payment_method, status, notes)
  VALUES
    (v_org_id, sale10, 75.00, (now() + interval '5 days')::date,  'cash', 'pending', 'Instalação'),
    (v_org_id, sale10, 29.99, (now() + interval '35 days')::date, 'cash', 'pending', 'Primeira mensalidade');

  -- ──────────────────────────────────────────────
  -- 7. PROPOSTAS
  -- ──────────────────────────────────────────────
  INSERT INTO proposals
    (id, organization_id, lead_id, total_value, status, notes, proposal_date, created_by)
  VALUES
    (prop1, v_org_id, lead8, 2800.00, 'sent',
     'Proposta completa para Hotel Costa Azul. Inclui fibra 1G + centralita 20R + TV em 45 quartos + suporte VIP.',
     (now() - interval '5 days')::date, v_user_id),

    (prop2, v_org_id, lead9, 1600.00, 'sent',
     'Proposta para 2 lojas do Supermercado Gonçalves. Centralita 20R por loja + fibra 500 + suporte.',
     (now() - interval '7 days')::date, v_user_id);

  -- ──────────────────────────────────────────────
  -- 8. DESPESAS
  -- ──────────────────────────────────────────────
  INSERT INTO expenses
    (organization_id, category_id, description, amount,
     expense_date, is_recurring, notes, created_by)
  VALUES
    -- Infraestrutura
    (v_org_id, cat_infra,
     'Aluguer de racks e colocation no datacenter Lisboa', 850.00,
     (now() - interval '5 days')::date, true,
     'Contrato anual, fraccionado mensalmente', v_user_id),

    (v_org_id, cat_infra,
     'Manutenção preventiva equipamentos de rede', 320.00,
     (now() - interval '12 days')::date, false,
     'Troca de fibra danificada na ligação da Av. da Liberdade', v_user_id),

    (v_org_id, cat_infra,
     'Antenas e repetidores — stock técnico', 1200.00,
     (now() - interval '20 days')::date, false,
     'Material para 5 instalações futuras já confirmadas', v_user_id),

    -- Marketing
    (v_org_id, cat_mkt,
     'Campanha Google Ads — Junho 2026', 500.00,
     (now() - interval '3 days')::date, true,
     'Budget mensal Google Ads para captação B2B', v_user_id),

    (v_org_id, cat_mkt,
     'Criação de conteúdo para Instagram e LinkedIn', 250.00,
     (now() - interval '8 days')::date, true,
     'Agência de conteúdo, contrato mensal', v_user_id),

    (v_org_id, cat_mkt,
     'Impressão de brochuras e material gráfico', 180.00,
     (now() - interval '15 days')::date, false,
     '500 brochuras para prospecção porta a porta', v_user_id),

    -- Pessoal
    (v_org_id, cat_pes,
     'Subsídio de refeição — equipa comercial (Maio)', 640.00,
     (now() - interval '10 days')::date, true,
     '4 comerciais x 8 dias x 20€', v_user_id),

    (v_org_id, cat_pes,
     'Formação técnica — certificação VOIP', 450.00,
     (now() - interval '25 days')::date, false,
     'Curso online para 2 técnicos, Asterisk + SIP avançado', v_user_id),

    -- Fornecedores
    (v_org_id, cat_forn,
     'Licença API Evolution — WhatsApp Business', 120.00,
     (now() - interval '2 days')::date, true,
     'Mensalidade Evolution API para automação de WhatsApp', v_user_id),

    (v_org_id, cat_forn,
     'Compra de routers e ONTs para stock', 2800.00,
     (now() - interval '30 days')::date, false,
     '20 routers + 15 ONTs para instalações do próximo mês', v_user_id),

    -- Software
    (v_org_id, cat_soft,
     'Licença Senvia OS CRM — Plano Business', 149.00,
     (now() - interval '1 day')::date, true,
     'Mensalidade CRM, plano business anual', v_user_id),

    (v_org_id, cat_soft,
     'Ferramenta de monitorização de rede (Zabbix Cloud)', 89.00,
     (now() - interval '7 days')::date, true,
     'SaaS de monitorização e alertas de rede', v_user_id),

    -- Viagens
    (v_org_id, cat_viag,
     'Combustível — visitas a clientes em Braga', 85.00,
     (now() - interval '4 days')::date, false,
     'Reunião Hotel Praia Dourada + visita a 2 prospects no Porto', v_user_id),

    (v_org_id, cat_viag,
     'Portagens — deslocações Porto/Lisboa (Maio)', 42.50,
     (now() - interval '11 days')::date, false,
     'Técnico em deslocação para instalações no norte', v_user_id),

    -- Material
    (v_org_id, cat_mat,
     'Papel, tinteiros e material de escritório', 95.00,
     (now() - interval '9 days')::date, false,
     'Reposição trimestral do armazém de escritório', v_user_id);

  -- ──────────────────────────────────────────────
  -- 9. EVENTOS DE CALENDÁRIO
  -- ──────────────────────────────────────────────
  INSERT INTO calendar_events
    (organization_id, user_id, lead_id, title, description,
     event_type, start_time, end_time, status)
  VALUES
    (v_org_id, v_user_id, lead6,
     'Reunião de prospecção — Marta Lima (Restaurante Mar e Sol)',
     'Reunião no restaurante para apresentação do Pack Business. Levar proposta impressa.',
     'meeting',
     (now() + interval '3 days' + interval '14 hours'),
     (now() + interval '3 days' + interval '15 hours'),
     'pending'),

    (v_org_id, v_user_id, lead7,
     'Reunião — João Pereira (Escritório Pereira & Associados)',
     'Apresentação da solução de linha dedicada + suporte prioritário para escritório de advogados.',
     'meeting',
     (now() + interval '5 days' + interval '10 hours'),
     (now() + interval '5 days' + interval '11 hours'),
     'pending'),

    (v_org_id, v_user_id, NULL,
     'Instalação — Academia FitLife',
     'Instalação de Fibra 500Mbps + Centralita 5R + Telemóvel. Levar 2 routers + ONT.',
     'task',
     (now() + interval '7 days' + interval '9 hours'),
     (now() + interval '7 days' + interval '12 hours'),
     'pending'),

    (v_org_id, v_user_id, NULL,
     'Renovação — Auto Peças Ferreira',
     'Confirmar satisfação e propor upsell de TV Box para a loja 2. Renovação do mês.',
     'reminder',
     (now() + interval '10 days' + interval '11 hours'),
     (now() + interval '10 days' + interval '11 hours' + interval '30 minutes'),
     'pending'),

    (v_org_id, v_user_id, lead8,
     'Follow-up proposta — Filipa Costa (Hotel Costa Azul)',
     'Prazo de decisão a expirar. Ligar para confirmar interesse e esclarecer dúvidas técnicas.',
     'call',
     (now() + interval '1 day' + interval '15 hours'),
     (now() + interval '1 day' + interval '15 hours' + interval '30 minutes'),
     'pending'),

    (v_org_id, v_user_id, lead3,
     'Demo produto — Logisticorp Portugal (Carlos Rodrigues)',
     'Demonstração da solução enterprise para empresa de logística. 3 armazéns, alto potencial.',
     'meeting',
     (now() + interval '2 days' + interval '16 hours'),
     (now() + interval '2 days' + interval '17 hours'),
     'pending');

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Dados fictícios inseridos com sucesso!';
  RAISE NOTICE 'Org: Telecom Demo Pro (%)', v_org_id;
  RAISE NOTICE '- 12 Produtos';
  RAISE NOTICE '- 10 Clientes CRM';
  RAISE NOTICE '- 15 Leads (3 novos, 2 contactados, 2 agendados, 2 proposta, 3 ganhos, 3 perdidos)';
  RAISE NOTICE '- 10 Vendas (mix de pending/in_progress/fulfilled/delivered)';
  RAISE NOTICE '- 25+ Pagamentos';
  RAISE NOTICE '- 2 Propostas';
  RAISE NOTICE '- 7 Categorias de despesa + 15 Despesas';
  RAISE NOTICE '- 6 Eventos de calendário';
  RAISE NOTICE '==============================================';
END $$;


-- ============================================================
-- LIMPEZA (opcional) — apaga TODOS os dados desta demo org
-- Descomentar e executar apenas se quiser recomeçar do zero
-- ============================================================
/*
DO $$
DECLARE v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE name ILIKE '%telecom%' LIMIT 1;
  DELETE FROM calendar_events     WHERE organization_id = v_org_id;
  DELETE FROM sale_payments       WHERE organization_id = v_org_id;
  DELETE FROM sale_items          WHERE sale_id IN (SELECT id FROM sales WHERE organization_id = v_org_id);
  DELETE FROM proposal_products   WHERE proposal_id IN (SELECT id FROM proposals WHERE organization_id = v_org_id);
  DELETE FROM proposals           WHERE organization_id = v_org_id;
  DELETE FROM sales               WHERE organization_id = v_org_id;
  DELETE FROM expenses            WHERE organization_id = v_org_id;
  DELETE FROM expense_categories  WHERE organization_id = v_org_id;
  DELETE FROM leads               WHERE organization_id = v_org_id;
  DELETE FROM crm_clients         WHERE organization_id = v_org_id;
  DELETE FROM products            WHERE organization_id = v_org_id;
  DELETE FROM pipeline_stages     WHERE organization_id = v_org_id;
  RAISE NOTICE 'Limpeza concluída para org %', v_org_id;
END $$;
*/
