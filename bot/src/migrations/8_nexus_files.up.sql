CREATE TABLE public.nexus_file_blob (
  id uuid PRIMARY KEY,
  "ownerChatId" bigint NOT NULL CHECK ("ownerChatId" > 0),
  "storageKey" text NOT NULL UNIQUE,
  sha256 varchar(64),
  "sizeBytes" bigint NOT NULL DEFAULT 0 CHECK ("sizeBytes" >= 0),
  "reservedBytes" bigint NOT NULL DEFAULT 20000000 CHECK ("reservedBytes" >= 0),
  state varchar(16) NOT NULL CHECK (
    state IN (
      'staging',
      'ready',
      'deleting',
      'expired',
      'failed'
    )
  ),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nexus_file_blob_owner_content ON public.nexus_file_blob ("ownerChatId", sha256, "sizeBytes")
WHERE
  state = 'ready';

CREATE TABLE public.nexus_file (
  id uuid PRIMARY KEY,
  "ownerChatId" bigint NOT NULL CHECK ("ownerChatId" > 0),
  "blobId" uuid NOT NULL REFERENCES public.nexus_file_blob (id),
  name varchar(200) NOT NULL,
  "declaredMime" varchar(200) NOT NULL,
  "mimeType" varchar(200) NOT NULL,
  "sizeBytes" bigint NOT NULL CHECK (
    "sizeBytes" >= 0
    AND "sizeBytes" <= 20000000
  ),
  sha256 varchar(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  source varchar(16) NOT NULL CHECK (source IN ('api', 'telegram', 'generated')),
  "telegramFileId" text,
  "telegramUniqueId" text,
  "uploadTaskId" uuid REFERENCES public.nexus_task (id),
  "uploadAttempt" integer,
  state varchar(16) NOT NULL CHECK (state IN ('ready', 'expired')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE INDEX nexus_file_owner ON public.nexus_file ("ownerChatId", "createdAt");

CREATE TABLE public.nexus_task_file (
  "taskId" uuid NOT NULL REFERENCES public.nexus_task (id),
  "fileId" uuid NOT NULL REFERENCES public.nexus_file (id),
  direction varchar(8) NOT NULL CHECK (direction IN ('input', 'output')),
  provenance varchar(16) NOT NULL CHECK (
    provenance IN ('current', 'quoted', 'history', 'generated')
  ),
  "sourceMessageId" integer,
  ordinal integer NOT NULL CHECK (
    ordinal >= 0
    AND ordinal < 20
  ),
  availability varchar(16) NOT NULL DEFAULT 'ready' CHECK (
    availability IN ('ready', 'expired', 'metadata-only')
  ),
  PRIMARY KEY ("taskId", direction, ordinal),
  UNIQUE ("taskId", "fileId", direction)
);

CREATE TABLE public.nexus_album_intake (
  "ownerChatId" bigint NOT NULL,
  "mediaGroupId" text NOT NULL,
  state varchar(16) NOT NULL DEFAULT 'collecting' CHECK (
    state IN ('collecting', 'finalizing', 'finalized', 'failed')
  ),
  "firstAt" timestamptz NOT NULL DEFAULT now(),
  "lastAt" timestamptz NOT NULL DEFAULT now(),
  messages jsonb NOT NULL DEFAULT '[]',
  "taskId" uuid REFERENCES public.nexus_task (id),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("ownerChatId", "mediaGroupId")
);

CREATE TABLE public.nexus_chat_file (
  "ownerChatId" bigint NOT NULL,
  "messageId" integer NOT NULL,
  ordinal integer NOT NULL,
  "fileId" uuid REFERENCES public.nexus_file (id),
  descriptor jsonb NOT NULL DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("ownerChatId", "messageId", ordinal)
);

CREATE TABLE public.nexus_file_delivery (
  "notificationId" uuid NOT NULL REFERENCES public.nexus_task_notification (id),
  "fileId" uuid REFERENCES public.nexus_file (id),
  ordinal integer NOT NULL,
  state varchar(16) NOT NULL DEFAULT 'pending' CHECK (
    state IN ('pending', 'sending', 'sent', 'uncertain')
  ),
  "telegramMessageId" integer,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("notificationId", ordinal)
);
