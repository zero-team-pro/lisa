CREATE TABLE IF NOT EXISTS public.server (
  id varchar(255) NOT NULL PRIMARY KEY,
  prefix varchar(255) DEFAULT '+' :: character varying NOT NULL,
  lang varchar(255) DEFAULT 'en' :: character varying NOT NULL,
  "raterLang" varchar(255) DEFAULT 'en' :: character varying NOT NULL,
  "mainChannelId" varchar(255),
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  "raterEngine" varchar(255) DEFAULT 'OCR' :: character varying NOT NULL,
  modules enum_server_modules [] DEFAULT ARRAY ['core'::enum_server_modules] NOT NULL
);

CREATE TABLE IF NOT EXISTS public.channel (
  id varchar(255) NOT NULL PRIMARY KEY,
  "serverId" varchar(255) REFERENCES public.server ON UPDATE CASCADE ON DELETE CASCADE,
  "isEnabled" boolean DEFAULT FALSE NOT NULL,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS public."user" (
  id serial PRIMARY KEY,
  "discordId" varchar(255),
  "serverId" varchar(255) REFERENCES public.server ON UPDATE CASCADE ON DELETE CASCADE,
  "isAdmin" boolean DEFAULT FALSE NOT NULL,
  "isBlocked" boolean DEFAULT FALSE NOT NULL,
  lang varchar(255),
  "raterLang" varchar(255),
  "raterLimit" integer DEFAULT 250 NOT NULL,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  "raterEngine" varchar(255)
);

CREATE INDEX IF NOT EXISTS user_discord_id ON public."user" ("discordId");

CREATE TABLE IF NOT EXISTS public.preset (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  weights varchar(255) NOT NULL,
  "serverId" varchar(255) REFERENCES public.server ON UPDATE CASCADE ON DELETE CASCADE,
  "userId" integer REFERENCES public."user" ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rater_call (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES public."user" ON UPDATE CASCADE ON DELETE CASCADE,
  time timestamp with time zone NOT NULL,
  rater varchar(255)
);

CREATE INDEX IF NOT EXISTS rater_call_user_id ON public.rater_call ("userId");

CREATE INDEX IF NOT EXISTS rater_call_time ON public.rater_call (time);

CREATE TABLE IF NOT EXISTS public."SequelizeMeta" (name varchar(255) NOT NULL PRIMARY KEY);

CREATE TABLE IF NOT EXISTS public.admin_user (
  id serial PRIMARY KEY,
  "discordId" varchar(255),
  role varchar(255) DEFAULT 'user' :: character varying NOT NULL,
  lang varchar(255),
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_user_discord_id ON public.admin_user ("discordId");

CREATE TABLE IF NOT EXISTS public.admin_user_to_server (
  "adminUserId" integer NOT NULL REFERENCES public.admin_user ON UPDATE CASCADE ON DELETE CASCADE,
  "serverId" varchar(255) NOT NULL REFERENCES public.server ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  PRIMARY KEY ("adminUserId", "serverId")
);

CREATE TABLE IF NOT EXISTS public.telegram_user (
  id bigint NOT NULL PRIMARY KEY,
  username varchar(255),
  lang varchar(255),
  "adminId" integer REFERENCES public.admin_user ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  "avatarUrlSmall" varchar(255),
  "avatarUrlBig" varchar(255)
);

CREATE INDEX IF NOT EXISTS telegram_user_admin_id ON public.telegram_user ("adminId");

CREATE TABLE IF NOT EXISTS public.telegram_chat (
  id bigint NOT NULL PRIMARY KEY,
  type varchar(255) NOT NULL,
  username varchar(255),
  title varchar(255),
  description varchar(255),
  "photoUrl" varchar(255),
  lang varchar(255),
  "adminId" integer NOT NULL REFERENCES public.admin_user ON UPDATE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS telegram_chat_admin_id ON public.telegram_chat ("adminId");

CREATE TABLE IF NOT EXISTS public.article (
  id bigserial PRIMARY KEY,
  transport varchar(255) NOT NULL,
  type varchar(255) DEFAULT 'Post' :: character varying NOT NULL,
  status varchar(255) DEFAULT 'Draft' :: character varying NOT NULL,
  title varchar(255),
  text text,
  "messageId" integer,
  "adminId" integer NOT NULL REFERENCES public.admin_user ON UPDATE CASCADE ON DELETE CASCADE,
  "chatId" bigint REFERENCES public.telegram_chat ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS article_admin_id ON public.article ("adminId");

CREATE INDEX IF NOT EXISTS article_chat_id ON public.article ("chatId");

CREATE TABLE IF NOT EXISTS public.outline_server (
  id serial PRIMARY KEY,
  "externalId" varchar(255),
  "accessUrl" varchar(255),
  name varchar(255),
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS outline_server_external_id ON public.outline_server ("externalId");

CREATE TABLE IF NOT EXISTS public.admin_user_to_outline_server (
  "adminUserId" integer NOT NULL REFERENCES public.admin_user ON UPDATE CASCADE ON DELETE CASCADE,
  "outlineServerId" integer NOT NULL REFERENCES public.outline_server ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  PRIMARY KEY ("adminUserId", "outlineServerId")
);

CREATE TABLE IF NOT EXISTS public.context (
  id serial PRIMARY KEY,
  owner varchar(255) NOT NULL,
  "ownerType" varchar(255) NOT NULL,
  module varchar(255) NOT NULL,
  data jsonb,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL,
  "chatId" varchar(255)
);

CREATE INDEX IF NOT EXISTS context_module ON public.context (module);

CREATE INDEX IF NOT EXISTS context_owner_type ON public.context ("ownerType");

CREATE INDEX IF NOT EXISTS context_owner ON public.context (owner);

CREATE INDEX IF NOT EXISTS context_chat_id ON public.context ("chatId");

CREATE TABLE IF NOT EXISTS public.ai_call (
  id serial PRIMARY KEY,
  "messageId" varchar(255) NOT NULL,
  owner varchar(255) NOT NULL,
  "ownerType" varchar(255) NOT NULL,
  "promptTokens" double precision NOT NULL,
  "completionTokens" double precision NOT NULL,
  "totalTokens" double precision NOT NULL,
  cost double precision NOT NULL,
  "createdAt" timestamp with time zone NOT NULL,
  model varchar(255) NOT NULL,
  "toolsTokens" varchar(255) DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_call_message_id ON public.ai_call ("messageId");

CREATE INDEX IF NOT EXISTS ai_call_owner ON public.ai_call (owner);

CREATE INDEX IF NOT EXISTS ai_call_owner_type ON public.ai_call ("ownerType");

CREATE TABLE IF NOT EXISTS public.ai_owner (
  id serial PRIMARY KEY,
  owner varchar(255) NOT NULL,
  "ownerType" varchar(255) NOT NULL,
  spent double precision DEFAULT '0' :: double precision NOT NULL,
  balance double precision NOT NULL,
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_owner_owner ON public.ai_owner (owner);

CREATE INDEX IF NOT EXISTS ai_owner_owner_type ON public.ai_owner ("ownerType");

CREATE TABLE IF NOT EXISTS public.payment_transaction (
  id serial PRIMARY KEY,
  owner varchar(255) NOT NULL,
  "ownerType" varchar(255) NOT NULL,
  amount double precision NOT NULL,
  method varchar(255) NOT NULL,
  status varchar(255) NOT NULL,
  "paymentData" varchar(255),
  message varchar(255),
  "createdAt" timestamp with time zone NOT NULL,
  "updatedAt" timestamp with time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_transaction_owner ON public.payment_transaction (owner);

CREATE INDEX IF NOT EXISTS payment_transaction_owner_type ON public.payment_transaction ("ownerType");

CREATE TABLE IF NOT EXISTS public.vm (
  id varchar(255) NOT NULL PRIMARY KEY,
  name varchar(255),
  token varchar(255),
  "externalIp" varchar(255),
  "createdAt" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS vm_name ON public.vm (name);

CREATE INDEX IF NOT EXISTS vm_token ON public.vm (token);

CREATE INDEX IF NOT EXISTS vm_external_ip ON public.vm ("externalIp");

CREATE TABLE IF NOT EXISTS public.giveaway (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  status varchar(255) NOT NULL,
  "completionType" varchar(255) NOT NULL,
  "completionDate" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT NOW() NOT NULL,
  "ownerId" varchar(255) NOT NULL,
  "ownerType" varchar(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS giveaway_status ON public.giveaway (status);

CREATE INDEX IF NOT EXISTS giveaway_owner_id ON public.giveaway ("ownerId");

CREATE INDEX IF NOT EXISTS giveaway_owner_type ON public.giveaway ("ownerType");

CREATE TABLE IF NOT EXISTS public.giveaway_user (
  id serial PRIMARY KEY,
  "userId" varchar(255) NOT NULL,
  "userType" varchar(255) NOT NULL,
  "giveawayId" integer NOT NULL REFERENCES public.giveaway ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS giveaway_user_user_id ON public.giveaway_user ("userId");

CREATE INDEX IF NOT EXISTS giveaway_user_user_type ON public.giveaway_user ("userType");

CREATE INDEX IF NOT EXISTS giveaway_user_giveaway_id ON public.giveaway_user ("giveawayId");

CREATE TABLE IF NOT EXISTS public.giveaway_prize (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  prize varchar(255) NOT NULL,
  "prizeType" varchar(255) NOT NULL,
  status varchar(255) NOT NULL,
  "giveawayId" integer NOT NULL REFERENCES public.giveaway ON UPDATE CASCADE ON DELETE CASCADE,
  "winnerId" integer REFERENCES public.giveaway_user ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS giveaway_prize_status ON public.giveaway_prize (status);

CREATE INDEX IF NOT EXISTS giveaway_prize_giveaway_id ON public.giveaway_prize ("giveawayId");

CREATE INDEX IF NOT EXISTS giveaway_prize_winner_id ON public.giveaway_prize ("winnerId");
