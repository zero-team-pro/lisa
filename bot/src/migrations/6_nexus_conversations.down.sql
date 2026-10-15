DROP TABLE public.nexus_chat_message;

DROP INDEX public.nexus_task_conversation;

DROP INDEX public.nexus_task_notification_message_ids;

ALTER TABLE public.nexus_task_notification
DROP COLUMN "messageIds",
DROP COLUMN "replyToMessageId";

ALTER TABLE public.nexus_task
DROP COLUMN interaction;
