CREATE TABLE public.nexus_reminder (
  id uuid PRIMARY KEY,
  "ownerChatId" bigint NOT NULL,
  "taskId" uuid REFERENCES public.nexus_task (id),
  "sourceMessageId" bigint,
  text text NOT NULL,
  "dueAt" timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (
    state IN (
      'pending',
      'sending',
      'sent',
      'uncertain',
      'cancelled'
    )
  ),
  "reactionAttemptAt" timestamptz,
  "reactionState" text NOT NULL DEFAULT 'none' CHECK (
    "reactionState" IN ('none', 'pending', 'sending', 'sent', 'uncertain')
  ),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("ownerChatId", "taskId")
);

CREATE INDEX nexus_reminder_due ON public.nexus_reminder ("dueAt")
WHERE
  state = 'pending';
