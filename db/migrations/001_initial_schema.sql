-- Migration: 001_initial_schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  "discordId" text NOT NULL UNIQUE,
  "discordUsername" character varying,
  "discordDiscriminator" character varying,
  "discordAvatar" character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS public."Characters" (
  "userId" text,
  "characterId" bigint NOT NULL,
  name character varying NOT NULL,
  series character varying NOT NULL,
  "imageUrl" character varying NOT NULL,
  "kakeraValue" bigint NOT NULL,
  "addedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" timestamp with time zone,
  "displayOrder" integer DEFAULT 0,
  "orderUpdatedAt" timestamp with time zone,
  CONSTRAINT Characters_pkey PRIMARY KEY ("characterId"),
  CONSTRAINT Characters_userId_fkey FOREIGN KEY ("userId") REFERENCES public.user_profiles("discordId") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public."Wishlist" (
  id serial NOT NULL,
  "userId" text NOT NULL,
  "characterId" bigint NOT NULL,
  "addedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes text,
  CONSTRAINT Wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT Wishlist_userId_fkey FOREIGN KEY ("userId") REFERENCES public.user_profiles("discordId") ON DELETE CASCADE,
  CONSTRAINT Wishlist_characterId_fkey FOREIGN KEY ("characterId") REFERENCES public."Characters"("characterId") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_userid ON public."Characters"("userId");
CREATE INDEX IF NOT EXISTS idx_wishlist_userid ON public."Wishlist"("userId");
