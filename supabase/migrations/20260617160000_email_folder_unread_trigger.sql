-- Keep email_folders.unread_count accurate automatically: recompute it from the
-- folder's messages whenever a message is inserted, has its seen flag/folder
-- changed, or is deleted. Previously only the gateway updated this count (and not
-- on new mail), so folder badges got stuck at 0 even with unread mail.
CREATE OR REPLACE FUNCTION public.recount_email_folder_unread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid uuid;
BEGIN
  fid := COALESCE(NEW.folder_id, OLD.folder_id);
  IF fid IS NOT NULL THEN
    UPDATE public.email_folders f
       SET unread_count = (SELECT count(*) FROM public.email_messages m WHERE m.folder_id = fid AND m.seen = false),
           updated_at = now()
     WHERE f.id = fid;
  END IF;
  -- On a move, the old folder also needs recounting.
  IF TG_OP = 'UPDATE' AND NEW.folder_id IS DISTINCT FROM OLD.folder_id AND OLD.folder_id IS NOT NULL THEN
    UPDATE public.email_folders f
       SET unread_count = (SELECT count(*) FROM public.email_messages m WHERE m.folder_id = OLD.folder_id AND m.seen = false),
           updated_at = now()
     WHERE f.id = OLD.folder_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recount_email_folder_unread ON public.email_messages;
CREATE TRIGGER trg_recount_email_folder_unread
AFTER INSERT OR UPDATE OR DELETE ON public.email_messages
FOR EACH ROW EXECUTE FUNCTION public.recount_email_folder_unread();

-- One-time backfill so existing folders show the right count immediately.
UPDATE public.email_folders f
   SET unread_count = (SELECT count(*) FROM public.email_messages m WHERE m.folder_id = f.id AND m.seen = false);
