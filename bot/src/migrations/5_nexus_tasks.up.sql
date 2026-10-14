CREATE TABLE IF NOT EXISTS public.nexus_task (
  "id" uuid PRIMARY KEY,
  "ownerChatId" bigint NOT NULL,
  "text" text NOT NULL,
  "source" varchar(16) NOT NULL CHECK ("source" IN ('api', 'telegram')),
  "status" varchar(16) NOT NULL DEFAULT 'queued' CHECK (
    "status" IN ('queued', 'leased', 'completed', 'failed')
  ),
  "clientRequestId" varchar(200),
  "createdBy" jsonb,
  "attemptCount" integer NOT NULL DEFAULT 0 CHECK (
    "attemptCount" >= 0
    AND "attemptCount" <= "maxAttempts"
  ),
  "maxAttempts" integer NOT NULL DEFAULT 3 CHECK ("maxAttempts" = 3),
  "availableAt" timestamptz,
  "workerId" varchar(200),
  "leaseTokenHash" varchar(64),
  "leaseExpiresAt" timestamptz,
  "provider" varchar(100),
  "resultSummary" text,
  "lastError" text,
  "completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nexus_task_owner_client_request ON public.nexus_task ("ownerChatId", "clientRequestId");

CREATE INDEX IF NOT EXISTS nexus_task_owner_status_available ON public.nexus_task (
  "ownerChatId",
  "status",
  "availableAt",
  "createdAt"
);

CREATE TABLE IF NOT EXISTS public.nexus_task_attempt (
  "id" bigserial PRIMARY KEY,
  "taskId" uuid NOT NULL REFERENCES public.nexus_task ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "attempt" integer NOT NULL CHECK ("attempt" > 0),
  "workerId" varchar(200) NOT NULL,
  "leaseTokenHash" varchar(64) NOT NULL,
  "leaseExpiresAt" timestamptz NOT NULL,
  "resultFingerprint" varchar(64),
  "outcome" varchar(16) CHECK (
    "outcome" IS NULL
    OR "outcome" IN ('completed', 'failed', 'retry')
  ),
  "provider" varchar(100),
  "summary" text,
  "error" text,
  "retryable" boolean,
  "retryAt" timestamptz,
  "resultReceivedAt" timestamptz,
  "execution" jsonb,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nexus_task_attempt_task_attempt ON public.nexus_task_attempt ("taskId", "attempt");

CREATE TABLE public.nexus_task_notification (
  "id" uuid PRIMARY KEY,
  "taskId" uuid NOT NULL REFERENCES public.nexus_task ("id") ON DELETE CASCADE,
  "ownerChatId" bigint NOT NULL,
  "text" text NOT NULL,
  "claimedUntil" timestamptz,
  "deliveredAt" timestamptz,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX nexus_task_notification_pending ON public.nexus_task_notification ("createdAt")
WHERE
  "deliveredAt" IS NULL;

CREATE INDEX nexus_task_expired_lease ON public.nexus_task ("leaseExpiresAt")
WHERE
  "status" = 'leased';

CREATE TABLE public.nexus_task_request (
  "id" uuid PRIMARY KEY,
  "operation" varchar(16) NOT NULL,
  "ownerChatId" bigint,
  "actor" jsonb NOT NULL,
  "payload" jsonb NOT NULL,
  "taskId" uuid,
  "responseStatus" integer,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX nexus_task_request_owner ON public.nexus_task_request ("ownerChatId", "createdAt");

CREATE INDEX nexus_task_request_task ON public.nexus_task_request ("taskId", "createdAt");

CREATE INDEX nexus_task_request_telegram_actor ON public.nexus_task_request (("actor" ->> 'telegramUserId'), "createdAt");

CREATE INDEX nexus_task_request_api_actor ON public.nexus_task_request (("actor" ->> 'apiTokenHash'), "createdAt");
