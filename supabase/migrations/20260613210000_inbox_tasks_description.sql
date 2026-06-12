-- Task detail modal: free-text description alongside the short title.
ALTER TABLE public.inbox_tasks ADD COLUMN description TEXT;
