ALTER TABLE admin_user
DROP CONSTRAINT fk_discord_user;

ALTER TABLE public.discord_user
RENAME TO "user";

DROP FUNCTION IF EXISTS uuid_generate_v7 ();
