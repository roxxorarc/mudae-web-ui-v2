-- Migration: 002_wishlist_unique
-- One wishlist entry per (user, character); enables ON CONFLICT DO NOTHING upserts.
ALTER TABLE public."Wishlist"
  ADD CONSTRAINT wishlist_user_character_unique UNIQUE ("userId", "characterId");
