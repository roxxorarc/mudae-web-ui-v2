import { createClient } from '@supabase/supabase-js';
import type { Character, AppUser, WishlistItem } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase returns bigint columns as strings in JS
const str = (v: unknown) => String(v);

function mapChar(row: Record<string, unknown>): Character {
  return {
    userId: row.userId as string,
    characterId: str(row.characterId),
    name: row.name as string,
    series: row.series as string | undefined,
    imageUrl: row.imageUrl as string | undefined,
    kakeraValue: row.kakeraValue as number | undefined,
    addedAt: row.addedAt as string,
    claimedAt: row.claimedAt as string | undefined,
    displayOrder: row.displayOrder as number | undefined,
    orderUpdatedAt: row.orderUpdatedAt as string | undefined,
  };
}

// ── Characters ────────────────────────────────────────────────

export async function fetchCharacters(params: {
  limit?: number;
  offset?: number;
  sortBy?: 'recent' | 'name' | 'kakera' | 'custom';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  owned?: boolean | null; // true=owned, false=available, null=all
  search?: string;
}): Promise<Character[]> {
  const { limit = 24, offset = 0, sortBy = 'kakera', sortOrder = 'desc', userId, owned, search } = params;

  let q = supabase.from('Characters').select('*');

  if (userId) q = q.eq('userId', userId);
  if (owned === true) q = q.not('userId', 'is', null).neq('userId', '');
  if (owned === false) q = q.or('userId.is.null,userId.eq.');
  if (search) q = q.or(`name.ilike.%${search}%,series.ilike.%${search}%`);

  switch (sortBy) {
    case 'name':   q = q.order('name', { ascending: sortOrder === 'asc' }); break;
    case 'kakera': q = q.order('kakeraValue', { ascending: sortOrder === 'asc', nullsFirst: false }).order('name', { ascending: true }); break;
    case 'custom': q = q.order('displayOrder', { ascending: sortOrder === 'asc', nullsFirst: false }).order('addedAt', { ascending: true }); break;
    default:       q = q.order('claimedAt', { ascending: sortOrder === 'asc' }).order('addedAt', { ascending: sortOrder === 'asc' }); break;
  }

  q = search ? q.limit(100) : q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(mapChar);
}

export async function fetchCharacterById(id: string): Promise<Character | null> {
  const { data, error } = await supabase.from('Characters').select('*').eq('characterId', id).maybeSingle();
  if (error) throw error;
  return data ? mapChar(data as Record<string, unknown>) : null;
}

export async function fetchUserCharactersAll(discordId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('Characters')
    .select('*')
    .eq('userId', discordId)
    .order('displayOrder', { ascending: true, nullsFirst: false })
    .order('addedAt', { ascending: true })
    .limit(10000);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(mapChar);
}

export async function updateCharacterOrder(updates: { characterId: string; newOrder: number }[]) {
  const now = new Date().toISOString();
  await Promise.all(
    updates.map(u =>
      supabase
        .from('Characters')
        .update({ displayOrder: u.newOrder, orderUpdatedAt: now })
        .eq('characterId', u.characterId)
    )
  );
}

// ── Users ─────────────────────────────────────────────────────

export async function fetchUsers(): Promise<AppUser[]> {
  // Fetch profiles and character counts in parallel with a single count query
  const [profilesRes, countsRes] = await Promise.all([
    supabase.from('user_profiles').select('discordId, discordUsername, discordAvatar'),
    supabase.from('Characters').select('userId').not('userId', 'is', null).neq('userId', ''),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (!profilesRes.data?.length) return [];

  // Build count map from the Characters query
  const countMap = new Map<string, number>();
  for (const row of (countsRes.data ?? [])) {
    const uid = row.userId as string;
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
  }

  return profilesRes.data
    .map(p => ({
      discordId: p.discordId as string,
      discordUsername: (p.discordUsername as string) || `User ${(p.discordId as string).slice(0, 8)}`,
      discordAvatar: buildAvatarUrl(p.discordId as string, p.discordAvatar as string | undefined),
      characterCount: countMap.get(p.discordId as string) ?? 0,
    }))
    .filter(u => u.characterCount > 0)
    .sort((a, b) => b.characterCount - a.characterCount);
}

export async function fetchUserProfile(discordId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('discordId, discordUsername, discordAvatar')
    .eq('discordId', discordId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    discordId: data.discordId as string,
    discordUsername: data.discordUsername as string,
    discordAvatar: buildAvatarUrl(data.discordId as string, data.discordAvatar as string | undefined),
  };
}

function buildAvatarUrl(discordId: string, avatar?: string) {
  if (!avatar) return undefined;
  if (avatar.startsWith('http')) return avatar;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`;
}

// ── Wishlist ──────────────────────────────────────────────────

export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('Wishlist')
    .select('id, userId, characterId, addedAt')
    .eq('userId', userId)
    .order('addedAt', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id as number,
    userId: r.userId as string,
    characterId: str(r.characterId),
    addedAt: r.addedAt as string,
  }));
}

export async function addToWishlist(userId: string, characterId: string) {
  const cid = BigInt(characterId).toString();
  const { data: existing } = await supabase
    .from('Wishlist').select('id').eq('userId', userId).eq('characterId', cid).maybeSingle();
  if (existing) return;
  const { error } = await supabase.from('Wishlist').insert({ userId, characterId: cid });
  if (error) throw error;
}

export async function removeFromWishlist(userId: string, characterId: string) {
  const { error } = await supabase
    .from('Wishlist').delete().eq('userId', userId).eq('characterId', BigInt(characterId).toString());
  if (error) throw error;
}

export async function fetchWishers(characterIds: string[]): Promise<Map<string, string[]>> {
  if (!characterIds.length) return new Map();
  const bigIntIds = characterIds.map(id => BigInt(id).toString());
  const { data, error } = await supabase
    .from('Wishlist')
    .select('characterId, userId')
    .in('characterId', bigIntIds);
  if (error || !data) return new Map();

  const map = new Map<string, string[]>();
  for (const row of data) {
    const id = str(row.characterId);
    map.set(id, [...(map.get(id) || []), row.userId as string]);
  }
  return map;
}
