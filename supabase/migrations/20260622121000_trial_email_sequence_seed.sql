-- Seed the trial email sequence (Sprint 2 of the activation initiative).
--
-- The trial lifecycle cron (check-trial-status) dispatches these 6 automation
-- triggers to process-automation, which looks up an email_templates row for the
-- Senvia agency org matching (automation_enabled = true, is_active = true,
-- automation_trigger_type = <trigger>). If no row exists, nothing is sent.
--
-- This migration ENSURES a template exists for each trigger, with activation-
-- focused copy. It is IDEMPOTENT and NON-DESTRUCTIVE: it only inserts a template
-- when one does not already exist for that trigger on the agency org, so any
-- copy the team already wrote is left untouched.
--
-- Trigger types (from check-trial-status): trial_started, trial_day_3,
-- trial_day_7, trial_expiring_3d, trial_expiring_1d, trial_expired.
-- Variables available: {{nome}} (admin/org name), {{email}}, {{empresa}}, {{data}}.

DO $$
DECLARE
  v_org uuid := '06fe9e1d-9670-45b0-8717-c5a6e90be380'; -- Senvia agency org
  v_head text;
  v_foot text;
BEGIN
  -- Shared HTML head/foot so the bodies stay short. Inline styles for email clients.
  v_head :=
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;">'
    || '<div style="font-size:20px;font-weight:700;color:#5b21b6;margin-bottom:16px;">Senvia OS</div>';
  v_foot :=
    '<hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;">'
    || '<div style="font-size:12px;color:#888;">Recebeu este email porque tem um período de teste do Senvia OS. '
    || 'Se precisar de ajuda, é só responder a este email.</div></div>';

  -- 1) Trial started — welcome + fastest path to value.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_started') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Boas-vindas (dia 0)',
      'Bem-vindo ao Senvia OS, {{nome}} 🚀',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">A sua conta está pronta. O Senvia OS dá mais resultado quando o vê a trabalhar com os <b>seus</b> dados reais. Em 5 minutos consegue chegar ao momento que importa: ver o primeiro negócio fechado dentro do sistema.</p>'
      || '<p style="font-size:15px;line-height:1.6;"><b>Comece por aqui:</b></p>'
      || '<ol style="font-size:15px;line-height:1.7;"><li>Importe as suas leads (CSV/Excel do Excel ou Google Sheets).</li><li>Crie o primeiro cliente.</li><li>Registe a primeira venda e veja o valor a entrar.</li></ol>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Começar agora</a></p>'
      || '<p style="font-size:14px;color:#555;">O Otto, o assistente do Senvia OS, guia-o passo a passo logo que entrar. É só pedir.</p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_started', '{}'::jsonb, 0);
  END IF;

  -- 2) Day 3 — activation nudge toward the first sale.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_day_3') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Dia 3 (ativação)',
      '{{nome}}, já registou o seu primeiro negócio?',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">As equipas que tiram mais partido do Senvia OS têm uma coisa em comum: registaram a <b>primeira venda</b> logo nos primeiros dias. É aí que tudo faz sentido, porque passa a ver o dinheiro e a margem organizados num só sítio.</p>'
      || '<p style="font-size:15px;line-height:1.6;">Ainda não o fez? Demora menos de 2 minutos:</p>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt/sales" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Registar uma venda</a></p>'
      || '<p style="font-size:14px;color:#555;">Prefere que o Otto o faça consigo? Abra o chat e diga "ajuda-me a registar uma venda".</p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_day_3', '{}'::jsonb, 0);
  END IF;

  -- 3) Day 7 — differentiators the user may not have discovered.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_day_7') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Dia 7 (diferenciadores)',
      '3 coisas que o Senvia OS faz por si',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">Está a meio do período de teste. Há três coisas que fazem a diferença e que talvez ainda não tenha experimentado:</p>'
      || '<ul style="font-size:15px;line-height:1.7;">'
      || '<li><b>WhatsApp integrado</b> — fale com os clientes sem sair do CRM.</li>'
      || '<li><b>Faturação automática</b> — emita faturas (InvoiceXpress/KeyInvoice) a partir da venda.</li>'
      || '<li><b>Propostas</b> — envie propostas profissionais e converta-as em vendas num clique.</li>'
      || '</ul>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Explorar no Senvia OS</a></p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_day_7', '{}'::jsonb, 0);
  END IF;

  -- 4) Expiring in 3 days.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_expiring_3d') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Faltam 3 dias',
      'Faltam 3 dias do seu teste, {{nome}}',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">O seu período de teste termina dentro de <b>3 dias</b>. Todo o trabalho que já fez (leads, clientes, vendas, propostas) fica guardado, e para continuar a usá-lo sem interrupções basta escolher um plano.</p>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt/settings" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Escolher o meu plano</a></p>'
      || '<p style="font-size:14px;color:#555;">Tem dúvidas sobre qual o plano certo? Responda a este email e ajudamos.</p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_expiring_3d', '{}'::jsonb, 0);
  END IF;

  -- 5) Expiring in 1 day.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_expiring_1d') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Último dia',
      'Último dia de teste, {{nome}}',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">É hoje que termina o seu período de teste. Para não perder o acesso ao seu CRM e a tudo o que já configurou, ative um plano agora. Leva menos de um minuto.</p>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt/settings" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Ativar o meu plano</a></p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_expiring_1d', '{}'::jsonb, 0);
  END IF;

  -- 6) Expired — data preserved, reactivation path.
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_expired') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Expirado',
      'O seu teste terminou, mas os seus dados estão guardados',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">O seu período de teste terminou. Boa notícia: <b>não perdeu nada</b>. As suas leads, clientes, vendas e configurações continuam guardadas e ficam disponíveis assim que ativar um plano.</p>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt/settings" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Reativar a minha conta</a></p>'
      || '<p style="font-size:14px;color:#555;">Se o Senvia OS não foi o que procurava, adorávamos saber porquê. Responda a este email com uma palavra que seja, ajuda-nos a melhorar.</p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_expired', '{}'::jsonb, 0);
  END IF;

  -- 7) Inactivity nudge (dispatched by trial-inactivity-check after 48h with no activity).
  IF NOT EXISTS (SELECT 1 FROM public.email_templates WHERE organization_id = v_org AND automation_trigger_type = 'trial_inactive_48h') THEN
    INSERT INTO public.email_templates
      (organization_id, name, subject, html_content, category, variables, is_active,
       automation_enabled, automation_trigger_type, automation_trigger_config, automation_delay_minutes)
    VALUES (v_org, 'Trial • Inatividade 48h',
      '{{nome}}, precisa de uma ajuda para começar?',
      v_head
      || '<p style="font-size:16px;">Olá {{nome}},</p>'
      || '<p style="font-size:15px;line-height:1.6;">Reparámos que ainda não teve oportunidade de explorar o Senvia OS. Sem stress, isto leva poucos minutos e nós ajudamos.</p>'
      || '<p style="font-size:15px;line-height:1.6;">O caminho mais rápido para perceber o valor: importe as suas leads e registe uma venda. A partir daí, tudo fica mais claro.</p>'
      || '<p style="margin:24px 0;"><a href="https://app.senvia.pt" style="background:#5b21b6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Abrir o Senvia OS</a></p>'
      || '<p style="font-size:14px;color:#555;">Quer que façamos uma demonstração rápida consigo? Responda a este email e marcamos 15 minutos.</p>'
      || v_foot,
      'trial', '["nome"]'::jsonb, true, true, 'trial_inactive_48h', '{}'::jsonb, 0);
  END IF;
END $$;
