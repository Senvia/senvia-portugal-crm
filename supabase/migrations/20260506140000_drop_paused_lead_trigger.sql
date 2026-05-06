-- Remove trigger that blocked lead creation/assignment for paused members.
-- The round-robin exclusion is already handled in application code.
DROP TRIGGER IF EXISTS prevent_assign_lead_to_paused_member ON public.leads;
DROP FUNCTION IF EXISTS public.prevent_assign_to_paused_member();
