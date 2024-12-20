-- Drop indexes
DROP INDEX IF EXISTS giveaway_prize_winner_id;

DROP INDEX IF EXISTS giveaway_prize_giveaway_id;

DROP INDEX IF EXISTS giveaway_prize_status;

DROP INDEX IF EXISTS giveaway_user_giveaway_id;

DROP INDEX IF EXISTS giveaway_user_user_type;

DROP INDEX IF EXISTS giveaway_user_user_id;

DROP INDEX IF EXISTS giveaway_owner_type;

DROP INDEX IF EXISTS giveaway_owner_id;

DROP INDEX IF EXISTS giveaway_status;

DROP INDEX IF EXISTS vm_external_ip;

DROP INDEX IF EXISTS vm_token;

DROP INDEX IF EXISTS vm_name;

DROP INDEX IF EXISTS payment_transaction_owner_type;

DROP INDEX IF EXISTS payment_transaction_owner;

DROP INDEX IF EXISTS ai_owner_owner_type;

DROP INDEX IF EXISTS ai_owner_owner;

DROP INDEX IF EXISTS ai_call_owner_type;

DROP INDEX IF EXISTS ai_call_owner;

DROP INDEX IF EXISTS ai_call_message_id;

DROP INDEX IF EXISTS context_chat_id;

DROP INDEX IF EXISTS context_owner;

DROP INDEX IF EXISTS context_owner_type;

DROP INDEX IF EXISTS context_module;

DROP INDEX IF EXISTS outline_server_external_id;

DROP INDEX IF EXISTS article_chat_id;

DROP INDEX IF EXISTS article_admin_id;

DROP INDEX IF EXISTS telegram_chat_admin_id;

DROP INDEX IF EXISTS telegram_user_admin_id;

DROP INDEX IF EXISTS admin_user_discord_id;

DROP INDEX IF EXISTS rater_call_time;

DROP INDEX IF EXISTS rater_call_user_id;

DROP INDEX IF EXISTS user_discord_id;

-- Drop tables
DROP TABLE IF EXISTS public.giveaway_prize;

DROP TABLE IF EXISTS public.giveaway_user;

DROP TABLE IF EXISTS public.giveaway;

DROP TABLE IF EXISTS public.vm;

DROP TABLE IF EXISTS public.payment_transaction;

DROP TABLE IF EXISTS public.ai_owner;

DROP TABLE IF EXISTS public.ai_call;

DROP TABLE IF EXISTS public.context;

DROP TABLE IF EXISTS public.admin_user_to_outline_server;

DROP TABLE IF EXISTS public.outline_server;

DROP TABLE IF EXISTS public.article;

DROP TABLE IF EXISTS public.telegram_chat;

DROP TABLE IF EXISTS public.telegram_user;

DROP TABLE IF EXISTS public.admin_user_to_server;

DROP TABLE IF EXISTS public.admin_user;

DROP TABLE IF EXISTS public."SequelizeMeta";

DROP TABLE IF EXISTS public.rater_call;

DROP TABLE IF EXISTS public.preset;

DROP TABLE IF EXISTS public."user";

DROP TABLE IF EXISTS public.channel;

DROP TABLE IF EXISTS public.server;
