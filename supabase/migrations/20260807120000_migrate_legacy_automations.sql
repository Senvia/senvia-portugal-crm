-- Converte as automações antigas (um template de email com gatilho carimbado)
-- em fluxos de um passo, para aparecerem no novo separador Automações sem o
-- cliente ter de as recriar à mão.
--
-- NÃO desliga o sistema antigo. Os fluxos convertidos nascem em `draft`: ficam
-- visíveis e editáveis, mas não inscrevem ninguém, por isso não há risco de o
-- mesmo email sair duas vezes enquanto os dois sistemas coexistem. Ativá-los (e
-- desligar o automation_enabled correspondente) é uma decisão do cliente, feita
-- na interface.

INSERT INTO public.automation_flows (
  organization_id, name, description, status, trigger_type, trigger_config,
  entry_node_id, graph, reentry_policy, created_by
)
SELECT
  t.organization_id,
  t.name,
  'Convertido automaticamente da automação de email antiga. Revê e ativa quando quiseres.',
  'draft',
  t.automation_trigger_type,
  COALESCE(t.automation_trigger_config, '{}'::jsonb),
  'trigger',
  -- Um nó de espera só entra no fluxo se a automação antiga tinha atraso, por
  -- isso o grafo inteiro é escolhido por CASE em vez de montado por partes.
  CASE WHEN COALESCE(t.automation_delay_minutes, 0) > 0 THEN
    jsonb_build_object(
      'nodes', jsonb_build_array(
        jsonb_build_object('id', 'trigger', 'type', t.automation_trigger_type,
          'config', COALESCE(t.automation_trigger_config, '{}'::jsonb),
          'position', jsonb_build_object('x', 0, 'y', 0)),
        jsonb_build_object('id', 'wait', 'type', 'wait',
          'config', jsonb_build_object('amount', t.automation_delay_minutes, 'unit', 'minutes'),
          'position', jsonb_build_object('x', 200, 'y', 0)),
        jsonb_build_object('id', 'email', 'type', 'send_email',
          'config', jsonb_build_object('template_id', t.id::text),
          'position', jsonb_build_object('x', 400, 'y', 0))
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', 'trigger', 'target', 'wait'),
        jsonb_build_object('id', 'e2', 'source', 'wait', 'target', 'email')
      )
    )
  ELSE
    jsonb_build_object(
      'nodes', jsonb_build_array(
        jsonb_build_object('id', 'trigger', 'type', t.automation_trigger_type,
          'config', COALESCE(t.automation_trigger_config, '{}'::jsonb),
          'position', jsonb_build_object('x', 0, 'y', 0)),
        jsonb_build_object('id', 'email', 'type', 'send_email',
          'config', jsonb_build_object('template_id', t.id::text),
          'position', jsonb_build_object('x', 200, 'y', 0))
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', 'trigger', 'target', 'email')
      )
    )
  END,
  'once',
  t.created_by
FROM public.email_templates t
WHERE t.automation_enabled = true
  AND t.is_active = true
  AND t.automation_trigger_type IS NOT NULL
  -- Idempotente: não recria o que já foi convertido numa execução anterior.
  AND NOT EXISTS (
    SELECT 1 FROM public.automation_flows f
    WHERE f.organization_id = t.organization_id
      AND f.graph::text LIKE '%' || t.id::text || '%'
  );
