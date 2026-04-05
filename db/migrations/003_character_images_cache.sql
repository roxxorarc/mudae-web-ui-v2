-- Cache for mudae.net image lists, keyed by characterId.
-- TTL: 7 days — images rarely change but occasionally get added.
CREATE TABLE IF NOT EXISTS public.character_images_cache (
  "characterId" bigint NOT NULL,
  images        text[]  NOT NULL DEFAULT '{}',
  cached_at     timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT character_images_cache_pkey PRIMARY KEY ("characterId")
);

-- No FK to Characters intentionally — cache should survive character deletions
-- and can be populated before a character is in the DB.
