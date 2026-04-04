-- Trigger to automatically create or update a user_profile when someone logs in via Supabase Discord OAuth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  discord_id text;
  d_username text;
  d_avatar text;
BEGIN
  discord_id := COALESCE(
    new.raw_app_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'provider_id'
  );
  
  d_username := COALESCE(
    new.raw_user_meta_data->'custom_claims'->>'global_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  d_avatar := new.raw_user_meta_data->>'avatar_url';

  IF discord_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, "discordId", "discordUsername", "discordAvatar")
    VALUES (
      new.id,
      discord_id,
      d_username,
      d_avatar
    )
    ON CONFLICT ("discordId") DO UPDATE SET
      id = EXCLUDED.id,
      "discordUsername" = EXCLUDED."discordUsername",
      "discordAvatar" = EXCLUDED."discordAvatar",
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
