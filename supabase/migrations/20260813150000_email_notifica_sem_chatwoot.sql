-- O email deixa de depender do Chatwoot para notificar.
--
-- Como estava: o gateway escrevia a mensagem em email_messages, e a notificação
-- no telemóvel vinha do `chatwoot-webhook` — ou seja, o aviso de um email só
-- chegava se o Chatwoot também tivesse recebido a mesma mensagem por IMAP. Duas
-- ligações IMAP à mesma caixa, uma delas só para tocar o telemóvel.
--
-- Como fica: quem escreve é quem avisa. A própria base de dados chama a função
-- de notificação quando entra uma mensagem nova. O Chatwoot deixa de ter
-- qualquer papel no email.

CREATE OR REPLACE FUNCTION public.notificar_email_novo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_canal   RECORD;
  v_pasta   RECORD;
  v_quem    TEXT;
  v_titulo  TEXT;
  v_corpo   TEXT;
  v_destino JSONB;
  v_chave   TEXT;
BEGIN
  -- Só as que chegam, e só as que ainda não foram lidas. A sincronização
  -- inicial de uma caixa traz centenas de mensagens antigas de uma vez: sem
  -- isto, ligar uma caixa disparava centenas de notificações.
  IF NEW.seen THEN RETURN NEW; END IF;

  SELECT id, organization_id, label, assigned_user_ids
    INTO v_canal
    FROM public.messaging_channels
   WHERE id = NEW.channel_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Só a caixa de entrada. Uma mensagem a aparecer em "Enviados" é a nossa
  -- própria resposta a ser sincronizada de volta — notificá-la seria avisar
  -- alguém de um email que essa pessoa acabou de escrever.
  SELECT role INTO v_pasta FROM public.email_folders WHERE id = NEW.folder_id;
  IF NOT FOUND OR v_pasta.role <> 'inbox' THEN RETURN NEW; END IF;

  v_quem := COALESCE(NULLIF(NEW.from_name, ''), NEW.from_address, 'Novo contacto');
  v_titulo := '📧 ' || v_quem;
  v_corpo := left(COALESCE(NULLIF(NEW.subject, ''), NEW.snippet, 'Nova mensagem'), 140);

  v_destino := jsonb_build_object(
    'organization_id', v_canal.organization_id,
    'title', v_titulo,
    'body', v_corpo,
    'url', '/inbox',
    -- Um aviso por remetente: dez emails seguidos da mesma pessoa substituem-se
    -- em vez de encherem o ecrã de bloqueio.
    'tag', 'email-' || COALESCE(NEW.from_address, NEW.id::text)
  );

  -- Quem atende a caixa. Vazio = a organização toda, como no resto do produto.
  IF v_canal.assigned_user_ids IS NOT NULL AND cardinality(v_canal.assigned_user_ids) > 0 THEN
    v_destino := v_destino || jsonb_build_object('user_ids', to_jsonb(v_canal.assigned_user_ids));
  END IF;

  -- Melhor esforço: um problema a notificar NUNCA pode impedir a mensagem de
  -- ser gravada. O gateway está a meio de um INSERT — se isto rebentar, perde-se
  -- o email, que é muito pior do que perder o aviso.
  BEGIN
    -- A chave vem do Vault, não escrita aqui: este ficheiro vai para o
    -- repositório, e um segredo commitado é um segredo perdido.
    SELECT decrypted_secret INTO v_chave
      FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF v_chave IS NULL THEN
      RAISE WARNING 'notificar_email_novo: service_role_key não está no Vault';
      RETURN NEW;
    END IF;

    PERFORM extensions.net.http_post(
      url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_chave
      ),
      body := v_destino
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notificar_email_novo: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_email_novo ON public.email_messages;
CREATE TRIGGER trg_notificar_email_novo
  AFTER INSERT ON public.email_messages
  FOR EACH ROW EXECUTE FUNCTION public.notificar_email_novo();
