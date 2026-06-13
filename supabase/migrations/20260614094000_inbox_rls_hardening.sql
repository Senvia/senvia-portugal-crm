-- QUALITY #19 — harden contact_notes and inbox_tasks.

-- contact_notes: no updated_at trigger, and INSERT did not force authorship, so
-- created_by/author could be forged by any org member. Force created_by to the
-- caller (service-role imports, where auth.uid() is null, keep their value) and
-- maintain updated_at.
CREATE OR REPLACE FUNCTION public.set_contact_note_author()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_notes_set_author ON public.contact_notes;
CREATE TRIGGER contact_notes_set_author
  BEFORE INSERT ON public.contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_contact_note_author();

DROP TRIGGER IF EXISTS contact_notes_updated_at ON public.contact_notes;
CREATE TRIGGER contact_notes_updated_at
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- inbox_tasks: UPDATE policy had no WITH CHECK, so a row could be updated to
-- point at another organization_id. Add the check.
DROP POLICY IF EXISTS "Org members can update inbox tasks" ON public.inbox_tasks;
CREATE POLICY "Org members can update inbox tasks"
  ON public.inbox_tasks FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
