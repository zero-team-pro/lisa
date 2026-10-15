ALTER TABLE public.nexus_task
ADD COLUMN interaction jsonb;

ALTER TABLE public.nexus_task_notification
ADD COLUMN "replyToMessageId" integer;

ALTER TABLE public.nexus_task_notification
ADD COLUMN "messageIds" integer[];

CREATE INDEX nexus_task_conversation ON public.nexus_task ((interaction ->> 'conversationId'), status);

CREATE TABLE public.nexus_chat_message (
  id uuid PRIMARY KEY,
  "ownerChatId" bigint NOT NULL CHECK ("ownerChatId" > 0),
  "messageId" integer NOT NULL CHECK ("messageId" > 0),
  role varchar(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  text text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("ownerChatId", "messageId")
);

CREATE INDEX nexus_chat_message_recent ON public.nexus_chat_message ("ownerChatId", "createdAt" DESC);

CREATE INDEX nexus_task_notification_message_ids ON public.nexus_task_notification USING gin ("messageIds")
WHERE
  "messageIds" IS NOT NULL;
