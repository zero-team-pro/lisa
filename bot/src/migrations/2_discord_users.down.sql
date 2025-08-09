ALTER TABLE public.discord_user
RENAME TO "user";

DROP FUNCTION IF EXISTS uuid_generate_v7 ();
