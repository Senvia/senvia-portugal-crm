-- ============================================================
-- PATCH v2 — Colaboradores + Eventos de Junho 2026
-- Org: TelecomPro Demo (a1b2c3d4-e5f6-7890-abcd-ef1234567890)
-- ============================================================

DO $$
DECLARE
  v_org_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- Colaboradores
  u_thiago  uuid := '504a57df-ad2a-4230-96c0-541fe197328a'; -- Thiago (admin)
  u_thais   uuid := '67da1542-4444-4f19-a539-d6229c7ca8b8'; -- Thais Lorraine (comercial)
  u_joao    uuid := '450648a5-0546-46e6-b333-27f29942a481'; -- João Monteiro (comercial)
  u_daniel  uuid := '2dcbf2eb-5576-4021-8a6a-6e847cc80c51'; -- Daniel Moreira (técnico)
  u_thyago  uuid := '94e655f9-8e2d-47ba-88df-286fe4cc4585'; -- Thyago Silva (comercial)

  -- Lead IDs já existentes (para associar nos eventos)
  -- Buscamos dinamicamente abaixo

BEGIN

  -- ──────────────────────────────────────────────
  -- 1. COLABORADORES (organization_members)
  -- ──────────────────────────────────────────────
  INSERT INTO organization_members (user_id, organization_id, role, commission_rate, is_active)
  VALUES
    (u_thiago, v_org_id, 'admin',       0,    true),
    (u_thais,  v_org_id, 'salesperson', 8.00, true),
    (u_joao,   v_org_id, 'salesperson', 8.00, true),
    (u_daniel, v_org_id, 'salesperson', 5.00, true),
    (u_thyago, v_org_id, 'salesperson', 8.00, true)
  ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = EXCLUDED.role,
        commission_rate = EXCLUDED.commission_rate,
        is_active = true;

  RAISE NOTICE 'Colaboradores adicionados: Thiago (admin), Thais, João, Daniel, Thyago';

  -- ──────────────────────────────────────────────
  -- 2. ATRIBUIR LEADS AOS COMERCIAIS
  -- ──────────────────────────────────────────────
  -- Distribui leads pelos comerciais de forma rotativa
  UPDATE leads SET assigned_to = u_thais
  WHERE organization_id = v_org_id
    AND status IN ('new', 'contacted')
    AND ctid IN (SELECT ctid FROM leads WHERE organization_id = v_org_id AND status IN ('new','contacted') ORDER BY created_at LIMIT 3);

  UPDATE leads SET assigned_to = u_joao
  WHERE organization_id = v_org_id
    AND status IN ('new', 'contacted', 'scheduled')
    AND ctid IN (SELECT ctid FROM leads WHERE organization_id = v_org_id AND status IN ('new','contacted','scheduled') ORDER BY created_at OFFSET 1 LIMIT 3);

  UPDATE leads SET assigned_to = u_thyago
  WHERE organization_id = v_org_id
    AND status IN ('scheduled', 'proposal')
    AND ctid IN (SELECT ctid FROM leads WHERE organization_id = v_org_id AND status IN ('scheduled','proposal') ORDER BY created_at LIMIT 2);

  UPDATE leads SET assigned_to = u_thiago
  WHERE organization_id = v_org_id
    AND status IN ('won', 'lost')
    AND assigned_to IS NULL
    AND ctid IN (SELECT ctid FROM leads WHERE organization_id = v_org_id AND status IN ('won','lost') AND assigned_to IS NULL LIMIT 4);

  -- ──────────────────────────────────────────────
  -- 3. EVENTOS DE CALENDÁRIO — JUNHO 2026 COMPLETO
  -- Apaga os anteriores e recria todos para não duplicar
  -- ──────────────────────────────────────────────
  DELETE FROM calendar_events WHERE organization_id = v_org_id;

  INSERT INTO calendar_events
    (organization_id, user_id, title, description, event_type, start_time, end_time, status)
  VALUES

    -- ── SEMANA 1 (1-7 Jun) ──────────────────────
    (v_org_id, u_thais,
     'Reunião de equipa — arranque do mês',
     'Alinhamento de metas para junho. Revisão do pipeline e distribuição de leads.',
     'meeting',
     '2026-06-02 09:00:00+01', '2026-06-02 10:00:00+01', 'completed'),

    (v_org_id, u_joao,
     'Prospecção telefónica — lista de Braga',
     'Contactar 20 empresas da lista de prospecção de Braga.',
     'call',
     '2026-06-02 14:00:00+01', '2026-06-02 17:00:00+01', 'completed'),

    (v_org_id, u_daniel,
     'Instalação — Salão de Beleza Alves',
     'Instalar fibra 200Mbps + telefone fixo. Morada: Rua do Comércio, 45, Lisboa.',
     'task',
     '2026-06-03 09:00:00+01', '2026-06-03 11:30:00+01', 'completed'),

    (v_org_id, u_thais,
     'Visita comercial — Farmácia Central do Porto',
     'Proposta de renovação e upsell de segundo Pack Business para balcão 2.',
     'meeting',
     '2026-06-03 14:30:00+01', '2026-06-03 15:30:00+01', 'completed'),

    (v_org_id, u_thyago,
     'Demo online — TechStart Lisboa (Miguel Santos)',
     'Demo do sistema de centralita virtual. Lead com alto potencial.',
     'meeting',
     '2026-06-04 10:00:00+01', '2026-06-04 11:00:00+01', 'completed'),

    (v_org_id, u_joao,
     'Follow-up — Construções Novais',
     'Segundo contacto após primeira chamada. Enviar proposta por email.',
     'call',
     '2026-06-04 15:00:00+01', '2026-06-04 15:30:00+01', 'completed'),

    (v_org_id, u_daniel,
     'Instalação — Garagem Superior (Nuno Martins)',
     'Instalar Fibra 500Mbps + Centralita 5 Ramais. Levar router + ONT.',
     'task',
     '2026-06-05 09:30:00+01', '2026-06-05 12:00:00+01', 'completed'),

    (v_org_id, u_thiago,
     'Reunião de revisão semanal',
     'Revisão de KPIs da semana. Vendas fechadas: 2. Novas reuniões: 5.',
     'meeting',
     '2026-06-06 09:00:00+01', '2026-06-06 09:45:00+01', 'completed'),

    -- ── SEMANA 2 (8-14 Jun) ──────────────────────
    (v_org_id, u_thais,
     'Visita — Clínica Vital (Sofia Mendes)',
     'Apresentação de proposta: Fibra 500 + Centralita 5R. Potencial 800€.',
     'meeting',
     '2026-06-09 10:00:00+01', '2026-06-09 11:00:00+01', 'completed'),

    (v_org_id, u_daniel,
     'Instalação — Creche Sol Nascente (Andreia Silva)',
     'Pack Business completo. Instalação prevista 3h. Levar material extra.',
     'task',
     '2026-06-09 14:00:00+01', '2026-06-09 17:00:00+01', 'completed'),

    (v_org_id, u_joao,
     'Call de prospecção — lista Porto Sul',
     'Contactar empresas do segmento restauração no Porto Sul.',
     'call',
     '2026-06-10 09:30:00+01', '2026-06-10 12:00:00+01', 'completed'),

    (v_org_id, u_thyago,
     'Reunião — Restaurante Mar e Sol (Marta Lima)',
     'Primeira reunião presencial. Levar brochura e proposta Pack Business.',
     'meeting',
     '2026-06-10 14:00:00+01', '2026-06-10 15:00:00+01', 'completed'),

    (v_org_id, u_thais,
     'Envio de proposta — Hotel Costa Azul',
     'Preparar e enviar proposta por email. Inclui fibra 1G + TV + Centralita 20R.',
     'task',
     '2026-06-10 16:00:00+01', '2026-06-10 17:00:00+01', 'completed'),

    (v_org_id, u_daniel,
     'Visita técnica — Hotel Praia Dourada',
     'Verificação pós-instalação e teste de cobertura TV nos quartos 201-220.',
     'task',
     '2026-06-11 10:00:00+01', '2026-06-11 12:00:00+01', 'completed'),

    (v_org_id, u_joao,
     'Reunião — Escritório Pereira & Associados',
     'Apresentação de solução de linha dedicada + suporte prioritário.',
     'meeting',
     '2026-06-11 15:00:00+01', '2026-06-11 16:00:00+01', 'completed'),

    (v_org_id, u_thiago,
     'Revisão semanal + pipeline',
     'Revisão KPIs semana 2. Leads ganhos: 1, Propostas enviadas: 2.',
     'meeting',
     '2026-06-13 09:00:00+01', '2026-06-13 09:45:00+01', 'completed'),

    (v_org_id, u_thyago,
     'Formação produto — nova linha Centralita 20R',
     'Formação interna sobre argumentário de venda da Centralita 20 Ramais.',
     'task',
     '2026-06-13 14:00:00+01', '2026-06-13 15:30:00+01', 'completed'),

    -- ── SEMANA 3 (15-21 Jun) — presente e futuro ──
    (v_org_id, u_daniel,
     'Instalação — Imobiliária Norte & Sul (hoje)',
     'Pack Business. Técnico no local às 10h. Duração estimada 2h.',
     'task',
     '2026-06-15 10:00:00+01', '2026-06-15 12:00:00+01', 'completed'),

    (v_org_id, u_thais,
     'Follow-up — Hotel Costa Azul (Filipa Costa)',
     'Prazo de decisão a expirar. Ligar para confirmar interesse.',
     'call',
     '2026-06-16 15:00:00+01', '2026-06-16 15:30:00+01', 'pending'),

    (v_org_id, u_thyago,
     'Demo — Logisticorp Portugal (Carlos Rodrigues)',
     'Demo da solução enterprise para 3 armazéns. Alto potencial: 3.200€.',
     'meeting',
     '2026-06-17 16:00:00+01', '2026-06-17 17:00:00+01', 'pending'),

    (v_org_id, u_joao,
     'Reunião — Marta Lima (Restaurante Mar e Sol)',
     'Apresentação de proposta Pack Business. Levar proposta impressa e tablet.',
     'meeting',
     '2026-06-18 14:00:00+01', '2026-06-18 15:00:00+01', 'pending'),

    (v_org_id, u_thiago,
     'Revisão semanal — metas de junho',
     'Ponto de situação a meio do mês. Meta: 5 vendas fechadas em junho.',
     'meeting',
     '2026-06-20 09:00:00+01', '2026-06-20 09:45:00+01', 'pending'),

    (v_org_id, u_daniel,
     'Instalação — Academia FitLife',
     'Fibra 500Mbps + Centralita 5R + Telemóvel 30GB. Levar 2 routers + ONT.',
     'task',
     '2026-06-20 09:00:00+01', '2026-06-20 12:00:00+01', 'pending'),

    (v_org_id, u_thais,
     'Visita — Clínica Vital (Sofia Mendes)',
     'Segundo encontro. Proposta ajustada com desconto de fidelização.',
     'meeting',
     '2026-06-20 14:30:00+01', '2026-06-20 15:30:00+01', 'pending'),

    -- ── SEMANA 4 (22-30 Jun) ──────────────────────
    (v_org_id, u_joao,
     'Reunião — João Pereira (Escritório Pereira & Associados)',
     'Reunião de fecho. Proposta final de linha dedicada + suporte prioritário.',
     'meeting',
     '2026-06-23 10:00:00+01', '2026-06-23 11:00:00+01', 'pending'),

    (v_org_id, u_thyago,
     'Call de fecho — Supermercado Gonçalves (Rui Gonçalves)',
     'Última oportunidade de fechar antes do fim do mês. 2 lojas, 1.600€.',
     'call',
     '2026-06-23 15:00:00+01', '2026-06-23 15:30:00+01', 'pending'),

    (v_org_id, u_daniel,
     'Manutenção — Hotel Praia Dourada',
     'Troca de router na ala B. Janela de manutenção 10h-12h acordada com hotel.',
     'task',
     '2026-06-24 10:00:00+01', '2026-06-24 12:00:00+01', 'pending'),

    (v_org_id, u_thais,
     'Renovação — Auto Peças Ferreira',
     'Confirmar renovação e propor upsell TV Box para loja 2. Valor em jogo: +15€/mês.',
     'call',
     '2026-06-25 11:00:00+01', '2026-06-25 11:30:00+01', 'pending'),

    (v_org_id, u_thyago,
     'Prospecção — lista de empresas Aveiro',
     'Contactar 15 empresas da nova lista de prospecção de Aveiro.',
     'call',
     '2026-06-25 14:00:00+01', '2026-06-25 17:00:00+01', 'pending'),

    (v_org_id, u_daniel,
     'Instalação — TechStart Lisboa (se fechar)',
     'Instalação Pack Business para 15 colaboradores. Confirmar venda antes.',
     'task',
     '2026-06-26 09:00:00+01', '2026-06-26 13:00:00+01', 'pending'),

    (v_org_id, u_thiago,
     'Revisão mensal — fecho de junho',
     'Análise dos resultados de junho. Propostas, conversão, receita recorrente.',
     'meeting',
     '2026-06-30 09:00:00+01', '2026-06-30 10:00:00+01', 'pending'),

    (v_org_id, u_joao,
     'Relatório mensal para gestão',
     'Preparar relatório de atividade comercial de junho para apresentar na reunião.',
     'task',
     '2026-06-30 14:00:00+01', '2026-06-30 16:00:00+01', 'pending');

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Patch v2 aplicado com sucesso!';
  RAISE NOTICE '- 5 Colaboradores adicionados (1 admin + 4 membros)';
  RAISE NOTICE '- Leads atribuídos aos comerciais';
  RAISE NOTICE '- 31 Eventos de calendário em junho (passado + futuro)';
  RAISE NOTICE '==============================================';
END $$;
