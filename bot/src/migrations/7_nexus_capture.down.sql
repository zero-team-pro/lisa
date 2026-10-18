-- Disable intake and drain/cancel queued capture work before dropping its type.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nexus_task WHERE operation IS NOT NULL AND status IN ('queued', 'leased')) THEN
    RAISE EXCEPTION 'Cannot roll back capture schema while capture tasks are queued or leased';
  END IF;
END
$$;

ALTER TABLE public.nexus_task_attempt
DROP COLUMN capture;

ALTER TABLE public.nexus_task
DROP COLUMN capture;

ALTER TABLE public.nexus_task
DROP COLUMN operation;
