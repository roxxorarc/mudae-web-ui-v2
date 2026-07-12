import { apiFetch, ApiError } from './api';
import type { Character, AppUser, WishlistItem } from './types';

// The API serializes bigint columns as strings
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

  const query = new URLSearchParams({
    sort: sortBy,
    order: sortOrder,
  });

  if (search) {
    query.set('limit', '100');
  } else {
    query.set('limit', String(limit));
    query.set('offset', String(offset));
  }
  if (userId) query.set('userId', userId);
  if (owned === true) query.set('owned', 'true');
  if (owned === false) query.set('owned', 'false');
  if (search) query.set('search', search);

  const rows = await apiFetch<Record<string, unknown>[]>(`/api/characters?${query}`);
  return rows.map(mapChar);
}

export async function fetchCharacterById(id: string): Promise<Character | null> {
  try {
    const row = await apiFetch<Record<string, unknown>>(`/api/characters/${id}`);
    return mapChar(row);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function fetchUserCharactersAll(discordId: string): Promise<Character[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/api/users/${discordId}/characters`);
  return rows.map(mapChar);
}

export async function updateCharacterOrder(updates: { characterId: string; newOrder: number }[]) {
  await apiFetch(`/api/characters/order`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ── Users ─────────────────────────────────────────────────────

export async function fetchUsers(): Promise<AppUser[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/api/users`);
  return rows.map(r => ({
    discordId: r.discordId as string,
    discordUsername: (r.discordUsername as string) || `User ${(r.discordId as string).slice(0, 8)}`,
    discordAvatar: buildAvatarUrl(r.discordId as string, r.discordAvatar as string | undefined),
    characterCount: r.characterCount as number,
  }));
}

export async function fetchUserProfile(discordId: string) {
  try {
    const data = await apiFetch<Record<string, unknown>>(`/api/users/${discordId}`);
    return {
      discordId: data.discordId as string,
      discordUsername: data.discordUsername as string,
      discordAvatar: buildAvatarUrl(data.discordId as string, data.discordAvatar as string | undefined),
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function buildAvatarUrl(discordId: string, avatar?: string) {
  if (!avatar) return undefined;
  if (avatar.startsWith('http')) return avatar;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`;
}

// ── Wishlist ──────────────────────────────────────────────────

export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const rows = await apiFetch<Record<string, unknown>[]>(`/api/wishlist/${userId}`);
  return rows.map(r => ({
    id: r.id as number,
    userId: r.userId as string,
    characterId: str(r.characterId),
    addedAt: r.addedAt as string,
  }));
}

export async function addToWishlist(_userId: string, characterId: string) {
  await apiFetch(`/api/wishlist`, {
    method: 'POST',
    body: JSON.stringify({ characterId: BigInt(characterId).toString() }),
  });
}

export async function removeFromWishlist(_userId: string, characterId: string) {
  await apiFetch(`/api/wishlist/${BigInt(characterId).toString()}`, { method: 'DELETE' });
}

export async function fetchWishers(characterIds: string[]): Promise<Map<string, string[]>> {
  if (!characterIds.length) return new Map();
  const ids = characterIds.map(id => BigInt(id).toString()).join(',');
  try {
    const data = await apiFetch<Record<string, string[]>>(`/api/wishers?characterIds=${ids}`);
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}
