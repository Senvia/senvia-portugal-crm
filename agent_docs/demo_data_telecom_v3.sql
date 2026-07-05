-- ============================================================
-- PATCH v3 — Utilizadores fictícios + Colaboradores + Eventos Junho
-- Org: TelecomPro Demo (a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- Password de todos os utilizadores demo: TelecomDemo2024!
-- ============================================================

DO $$
DECLARE
  v_org_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- UUIDs dos utilizadores fictícios
  fu_admin  uuid := 'dd000001-0000-0000-0000-000000000001'; -- Inês Rodrigues (admin)
  fu_c1     uuid := 'dd000001-0000-0000-0000-000000000002'; -- Ana Costa (comercial)
  fu_c2     uuid := 'dd000001-0000-0000-0000-000000000003'; -- Marco Silva (comercial)
  fu_c3     uuid := 'dd000001-0000-0000-0000-000000000004'; -- Rita Fernandes (comercial)
  fu_tec    uuid := 'dd000001-0000-0000-0000-000000000005'; -- Paulo Gomes (técnico)

  v_pw text;

BEGIN
  -- Hash da password (bcrypt)
  v_pw := crypt('TelecomDemo2024!', gen_salt('bf', 10));

  -- ──────────────────────────────────────────────
  -- 1. CRIAR UTILIZADORES NO AUTH
  -- ──────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES
    (fu_admin, 'authenticated', 'authenticated',
     'ines.rodrigues@telecomdemo.pt', v_pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Inês Rodrigues"}',
     false, now(), now()),

    (fu_c1, 'authenticated', 'authenticated',
     'ana.costa@telecomdemo.pt', v_pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Ana Costa"}',
     false, now(), now()),

    (fu_c2, 'authenticated', 'authenticated',
     'marco.silva@telecomdemo.pt', v_pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Marco Silva"}',
     false, now(), now()),

    (fu_c3, 'authenticated', 'authenticated',
     'rita.fernandes@telecomdemo.pt', v_pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Rita Fernandes"}',
     false, now(), now()),

    (fu_tec, 'authenticated', 'authenticated',
     'paulo.gomes@telecomdemo.pt', v_pw, now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Paulo Gomes"}',
     false, now(), now())

  ON CONFLICT (id) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 2. CRIAR PROFILES
  -- ──────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, email, organization_id)
  VALUES
    (fu_admin, 'Inês Rodrigues',  'ines.rodrigues@telecomdemo.pt',  v_org_id),
    (fu_c1,    'Ana Costa',       'ana.costa@telecomdemo.pt',        v_org_id),
    (fu_c2,    'Marco Silva',     'marco.silva@telecomdemo.pt',      v_org_id),
    (fu_c3,    'Rita Fernandes',  'rita.fernandes@telecomdemo.pt',   v_org_id),
    (fu_tec,   'Paulo Gomes',     'paulo.gomes@telecomdemo.pt',      v_org_id)
  ON CONFLICT (id) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 3. ADICIONAR À ORG
  -- ──────────────────────────────────────────────
  INSERT INTO organization_members (user_id, organization_id, role, commission_rate, is_active)
  VALUES
    (fu_admin, v_org_id, 'admin',       0,    true),
    (fu_c1,    v_org_id, 'salesperson', 8.00, true),
    (fu_c2,    v_org_id, 'salesperson', 8.00, true),
    (fu_c3,    v_org_id, 'salesperson', 8.00, true),
    (fu_tec,   v_org_id, 'salesperson', 5.00, true)
  ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = EXCLUDED.role, commission_rate = EXCLUDED.commission_rate, is_active = true;

  RAISE NOTICE 'Utilizadores fictícios criados e associados à org.';

  -- ──────────────────────────────────────────────
  -- 4. ATRIBUIR LEADS AOS COMERCIAIS
  -- ──────────────────────────────────────────────
  -- Ana Costa — leads novos e contactados
  WITH batch AS (
    SELECT id FROM leads
    WHERE organization_id = v_org_id AND status IN ('new','contacted')
    ORDER BY created_at LIMIT 5
  )
  UPDATE leads SET assigned_to = fu_c1
  WHERE id IN (SELECT id FROM batch);

  -- Marco Silva — leads agendados e proposta
  WITH batch AS (
    SELECT id FROM leads
    WHERE organization_id = v_org_id AND status IN ('scheduled','proposal')
    ORDER BY created_at LIMIT 4
  )
  UPDATE leads SET assigned_to = fu_c2
  WHERE id IN (SELECT id FROM batch);

  -- Rita Fernandes — leads ganhos
  WITH batch AS (
    SELECT id FROM leads
    WHERE organization_id = v_org_id AND status = 'won'
    ORDER BY created_at LIMIT 5
  )
  UPDATE leads SET assigned_to = fu_c3
  WHERE id IN (SELECT id FROM batch);

  -- Inês — leads perdidos (gestão/revisão)
  WITH batch AS (
    SELECT id FROM leads
    WHERE organization_id = v_org_id AND status = 'lost'
    ORDER BY created_at LIMIT 4
  )
  UPDATE leads SET assigned_to = fu_admin
  WHERE id IN (SELECT id FROM batch);

  RAISE NOTICE 'Leads atribuídos aos comerciais.';

  -- ──────────────────────────────────────────────
  -- 5. EVENTOS DE CALENDÁRIO — JUNHO 2026 COMPLETO
  -- ──────────────────────────────────────────────
  DELETE FROM calendar_events WHERE organization_id = v_org_id;

  INSERT INTO calendar_events
    (organization_id, user_id, title, description, event_type, start_time, end_time, status)
  VALUES

    -- ── 2 Jun (segunda) ────────────────────────
    (v_org_id, fu_admin,
     'Reunião de equipa — arranque de junho',
     'Alinhamento de metas, distribuição de leads e revisão do pipeline.',
     'meeting', '2026-06-02 09:00+01', '2026-06-02 10:00+01', 'completed'),

    (v_org_id, fu_c2,
     'Prospecção telefónica — lista Braga',
     'Contactar 20 empresas da lista de Braga. Foco em restauração e clínicas.',
     'call', '2026-06-02 14:00+01', '2026-06-02 17:00+01', 'completed'),

    -- ── 3 Jun (terça) ──────────────────────────
    (v_org_id, fu_tec,
     'Instalação — Salão de Beleza Alves',
     'Fibra 200Mbps + Telefone Fixo. Morada: Rua do Comércio, 45, Lisboa.',
     'task', '2026-06-03 09:00+01', '2026-06-03 11:30+01', 'completed'),

    (v_org_id, fu_c1,
     'Visita comercial — Farmácia Central do Porto',
     'Apresentar proposta de upsell: segundo Pack Business para o balcão 2.',
     'meeting', '2026-06-03 14:30+01', '2026-06-03 15:30+01', 'completed'),

    -- ── 4 Jun (quarta) ─────────────────────────
    (v_org_id, fu_c3,
     'Demo online — TechStart Lisboa (Miguel Santos)',
     'Demo de centralita virtual para escritório de 15 pessoas. Alto potencial.',
     'meeting', '2026-06-04 10:00+01', '2026-06-04 11:00+01', 'completed'),

    (v_org_id, fu_c2,
     'Follow-up — Construções Novais (Pedro Oliveira)',
     'Segundo contacto após primeira chamada. Enviar proposta fibra + TV.',
     'call', '2026-06-04 15:00+01', '2026-06-04 15:30+01', 'completed'),

    -- ── 5 Jun (quinta) ─────────────────────────
    (v_org_id, fu_tec,
     'Instalação — Garagem Superior (Nuno Martins)',
     'Fibra 500Mbps + Centralita 5 Ramais. Levar router + ONT.',
     'task', '2026-06-05 09:30+01', '2026-06-05 12:00+01', 'completed'),

    (v_org_id, fu_c1,
     'Call — Supermercado O Frescal',
     'Confirmar satisfação com a instalação e propor Telemóvel 30GB.',
     'call', '2026-06-05 14:00+01', '2026-06-05 14:30+01', 'completed'),

    -- ── 6 Jun (sexta) ──────────────────────────
    (v_org_id, fu_admin,
     'Revisão semanal — semana 1',
     'KPIs: 2 instalações, 1 proposta enviada, 5 chamadas de prospecção.',
     'meeting', '2026-06-06 09:00+01', '2026-06-06 09:45+01', 'completed'),

    (v_org_id, fu_c3,
     'Envio de proposta — Clínica Vital (Sofia Mendes)',
     'Preparar e enviar proposta: Fibra 500 + Centralita 5R. Valor: 800€.',
     'task', '2026-06-06 15:00+01', '2026-06-06 16:00+01', 'completed'),

    -- ── 9 Jun (segunda) ────────────────────────
    (v_org_id, fu_c1,
     'Visita — Clínica Vital (Sofia Mendes)',
     'Reunião de apresentação da proposta. Levar tablet com demo.',
     'meeting', '2026-06-09 10:00+01', '2026-06-09 11:00+01', 'completed'),

    (v_org_id, fu_tec,
     'Instalação — Creche Sol Nascente (Andreia Silva)',
     'Pack Business completo. Duração estimada 3h. Levar material extra.',
     'task', '2026-06-09 14:00+01', '2026-06-09 17:00+01', 'completed'),

    -- ── 10 Jun (terça) ─────────────────────────
    (v_org_id, fu_c2,
     'Prospecção — lista Porto Sul',
     'Contactar empresas do segmento restauração no Porto Sul.',
     'call', '2026-06-10 09:30+01', '2026-06-10 12:00+01', 'completed'),

    (v_org_id, fu_c3,
     'Reunião — Restaurante Mar e Sol (Marta Lima)',
     'Primeira reunião presencial. Apresentar Pack Business para restaurante de luxo.',
     'meeting', '2026-06-10 14:00+01', '2026-06-10 15:00+01', 'completed'),

    (v_org_id, fu_c1,
     'Envio de proposta — Hotel Costa Azul (Filipa Costa)',
     'Preparar proposta completa: Fibra 1G + TV 45 quartos + Centralita 20R.',
     'task', '2026-06-10 16:00+01', '2026-06-10 17:00+01', 'completed'),

    -- ── 11 Jun (quarta) ────────────────────────
    (v_org_id, fu_tec,
     'Visita técnica — Hotel Praia Dourada',
     'Verificação pós-instalação e teste de cobertura TV nos quartos 201-220.',
     'task', '2026-06-11 10:00+01', '2026-06-11 12:00+01', 'completed'),

    (v_org_id, fu_c2,
     'Reunião — Escritório Pereira & Associados (João Pereira)',
     'Apresentação de solução de linha dedicada + suporte prioritário.',
     'meeting', '2026-06-11 15:00+01', '2026-06-11 16:00+01', 'completed'),

    -- ── 12 Jun (quinta) ────────────────────────
    (v_org_id, fu_c3,
     'Call de fecho — Supermercado Gonçalves (Rui Gonçalves)',
     'Tentar fechar proposta de 1.600€. 2 lojas, centralita 20R por loja.',
     'call', '2026-06-12 10:00+01', '2026-06-12 10:30+01', 'completed'),

    (v_org_id, fu_c1,
     'Prospecção — lista Aveiro',
     'Contactar 15 empresas novas de Aveiro. Foco em hotelaria e clínicas.',
     'call', '2026-06-12 14:00+01', '2026-06-12 17:00+01', 'completed'),

    -- ── 13 Jun (sexta) ─────────────────────────
    (v_org_id, fu_admin,
     'Revisão semanal — semana 2',
     'KPIs: 2 propostas enviadas, 1 fecho (Creche Sol Nascente), pipeline em crescimento.',
     'meeting', '2026-06-13 09:00+01', '2026-06-13 09:45+01', 'completed'),

    (v_org_id, fu_c2,
     'Formação interna — Centralita 20R',
     'Formação sobre argumentário de venda e casos de uso da Centralita 20 Ramais.',
     'task', '2026-06-13 14:00+01', '2026-06-13 15:30+01', 'completed'),

    -- ── 15 Jun — HOJE ──────────────────────────
    (v_org_id, fu_tec,
     'Instalação — Imobiliária Norte & Sul (hoje)',
     'Pack Business. Técnico no local desde as 10h. Duração estimada 2h.',
     'task', '2026-06-15 10:00+01', '2026-06-15 12:00+01', 'completed'),

    (v_org_id, fu_admin,
     'Reunião de pipeline — ponto de situação',
     'Revisão das propostas abertas: Hotel Costa Azul e Supermercado Gonçalves.',
     'meeting', '2026-06-15 15:00+01', '2026-06-15 15:45+01', 'completed'),

    -- ── 16 Jun (segunda) ────────────────────────
    (v_org_id, fu_c1,
     'Follow-up — Hotel Costa Azul (Filipa Costa)',
     'Prazo de decisão a expirar. Ligar para confirmar interesse e esclarecer dúvidas.',
     'call', '2026-06-16 15:00+01', '2026-06-16 15:30+01', 'pending'),

    (v_org_id, fu_c3,
     'Prospecção — lista Lisboa Norte',
     'Contactar 18 empresas da nova lista de Lisboa Norte.',
     'call', '2026-06-16 09:00+01', '2026-06-16 12:00+01', 'pending'),

    -- ── 17 Jun (terça) ──────────────────────────
    (v_org_id, fu_c2,
     'Demo — Logisticorp Portugal (Carlos Rodrigues)',
     'Demo solução enterprise para 3 armazéns. Potencial 3.200€. Preparar proposta custom.',
     'meeting', '2026-06-17 16:00+01', '2026-06-17 17:00+01', 'pending'),

    (v_org_id, fu_tec,
     'Visita técnica — Supermercado O Frescal',
     'Verificação da centralita e configuração de mais 2 ramais internos.',
     'task', '2026-06-17 10:00+01', '2026-06-17 11:30+01', 'pending'),

    -- ── 18 Jun (quarta) ─────────────────────────
    (v_org_id, fu_c3,
     'Reunião — Marta Lima (Restaurante Mar e Sol)',
     'Apresentação de proposta Pack Business. Levar proposta impressa e tablet.',
     'meeting', '2026-06-18 14:00+01', '2026-06-18 15:00+01', 'pending'),

    (v_org_id, fu_c1,
     'Visita — Clínica Vital — 2ª reunião',
     'Proposta ajustada com desconto de fidelização. Objetivo: fechar.',
     'meeting', '2026-06-18 10:00+01', '2026-06-18 11:00+01', 'pending'),

    -- ── 19 Jun (quinta) ─────────────────────────
    (v_org_id, fu_c2,
     'Call de fecho — Supermercado Gonçalves',
     'Última oportunidade antes do fim do mês. Confirmar decisão sobre proposta.',
     'call', '2026-06-19 10:00+01', '2026-06-19 10:30+01', 'pending'),

    -- ── 20 Jun (sexta) ──────────────────────────
    (v_org_id, fu_admin,
     'Revisão semanal — semana 3',
     'Meta do mês: 5 vendas. Situação: 3 fechadas. Foco nas propostas abertas.',
     'meeting', '2026-06-20 09:00+01', '2026-06-20 09:45+01', 'pending'),

    (v_org_id, fu_tec,
     'Instalação — Academia FitLife',
     'Fibra 500Mbps + Centralita 5R + Telemóvel 30GB. Levar 2 routers + ONT.',
     'task', '2026-06-20 09:00+01', '2026-06-20 12:00+01', 'pending'),

    -- ── 23 Jun (segunda) ────────────────────────
    (v_org_id, fu_c2,
     'Reunião de fecho — Escritório Pereira & Associados',
     'Proposta final: linha dedicada + suporte prioritário. Objetivo: assinar contrato.',
     'meeting', '2026-06-23 10:00+01', '2026-06-23 11:00+01', 'pending'),

    (v_org_id, fu_c1,
     'Prospecção — lista Setúbal',
     'Contactar 12 empresas de Setúbal. Foco em indústria e logística.',
     'call', '2026-06-23 14:00+01', '2026-06-23 17:00+01', 'pending'),

    -- ── 24 Jun (terça) ──────────────────────────
    (v_org_id, fu_tec,
     'Manutenção — Hotel Praia Dourada',
     'Troca de router na ala B. Janela de manutenção 10h-12h acordada com o hotel.',
     'task', '2026-06-24 10:00+01', '2026-06-24 12:00+01', 'pending'),

    (v_org_id, fu_c3,
     'Visita — TechStart Lisboa (Miguel Santos)',
     'Apresentar proposta Pack Business para 15 colaboradores. Potencial 1.500€.',
     'meeting', '2026-06-24 14:00+01', '2026-06-24 15:00+01', 'pending'),

    -- ── 25 Jun (quarta) ─────────────────────────
    (v_org_id, fu_c1,
     'Renovação — Auto Peças Ferreira',
     'Confirmar renovação e propor upsell TV Box para loja 2. +14,99€/mês.',
     'call', '2026-06-25 11:00+01', '2026-06-25 11:30+01', 'pending'),

    (v_org_id, fu_c2,
     'Prospecção — lista Coimbra',
     'Contactar 15 empresas de Coimbra. Segmento: saúde e educação.',
     'call', '2026-06-25 14:00+01', '2026-06-25 17:00+01', 'pending'),

    -- ── 26 Jun (quinta) ─────────────────────────
    (v_org_id, fu_tec,
     'Instalação — TechStart Lisboa (se fechar)',
     'Pack Business para 15 colaboradores. Confirmar venda antes da ida.',
     'task', '2026-06-26 09:00+01', '2026-06-26 13:00+01', 'pending'),

    (v_org_id, fu_c3,
     'Call — Logisticorp Portugal',
     'Follow-up à demo de terça. Enviar proposta e confirmar interesse.',
     'call', '2026-06-26 15:00+01', '2026-06-26 15:30+01', 'pending'),

    -- ── 27 Jun (sexta) ──────────────────────────
    (v_org_id, fu_admin,
     'Revisão semanal — semana 4',
     'Balanço pré-fecho de mês. Confirmar propostas em aberto e próximas renovações.',
     'meeting', '2026-06-27 09:00+01', '2026-06-27 09:45+01', 'pending'),

    -- ── 30 Jun (segunda) ────────────────────────
    (v_org_id, fu_admin,
     'Fecho mensal — análise de junho',
     'Revisão completa de KPIs de junho: receita, conversão, MRR adicionado.',
     'meeting', '2026-06-30 09:00+01', '2026-06-30 10:00+01', 'pending'),

    (v_org_id, fu_c1,
     'Relatório de atividade — junho',
     'Preparar relatório de atividade comercial para apresentar na reunião de fecho.',
     'task', '2026-06-30 14:00+01', '2026-06-30 16:00+01', 'pending'),

    (v_org_id, fu_c2,
     'Relatório de atividade — junho',
     'Consolidar chamadas, reuniões e propostas do mês.',
     'task', '2026-06-30 14:00+01', '2026-06-30 16:00+01', 'pending');

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Patch v3 concluído!';
  RAISE NOTICE '- 5 utilizadores fictícios criados (telecomdemo.pt)';
  RAISE NOTICE '- 5 colaboradores adicionados à org';
  RAISE NOTICE '- Leads atribuídos aos comerciais';
  RAISE NOTICE '- 42 eventos de calendário em junho 2026';
  RAISE NOTICE '==============================================';
END $$;
