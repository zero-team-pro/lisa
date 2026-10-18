ALTER TABLE public.nexus_task
ADD COLUMN operation jsonb;

ALTER TABLE public.nexus_task
ADD COLUMN capture jsonb;

ALTER TABLE public.nexus_task_attempt
ADD COLUMN capture jsonb;
