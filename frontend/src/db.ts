// Demo data layer: same public API as the real one, but served from
// embedded fixtures. Mutations (reorder, wishlist) only touch in-memory
// state — a page reload restores the seeded demo.
import type { Character, AppUser, WishlistItem } from './types';
import {
  DEMO_CHARACTERS,
  DEMO_GALLERIES,
  DEMO_USERS,
  DEMO_WISHLISTS,
} from './demo/data';

const LATENCY = 180; // keep skeletons visible, like a real network

function delay<T>(value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), LATENCY));
}

// ── Session state (resets on reload) ──────────────────────────
const characters: Character[] = DEMO_CHARACTERS.map(c => ({ ...c }));
const wishlists = new Map<string, Set<string>>(
  Object.entries(DEMO_WISHLISTS).map(([userId, ids]) => [userId, new Set(ids)])
);

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

  let rows = characters.slice();
  if (userId) rows = rows.filter(c => c.userId === userId);
  if (owned === true) rows = rows.filter(c => c.userId);
  if (owned === false) rows = rows.filter(c => !c.userId);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(c =>
      c.name.toLowerCase().includes(q) || c.series?.toLowerCase().includes(q)
    );
  }

  const dir = sortOrder === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return dir * a.name.localeCompare(b.name);
      case 'recent': {
        const ta = Date.parse(a.claimedAt ?? a.addedAt);
        const tb = Date.parse(b.claimedAt ?? b.addedAt);
        return dir * (ta - tb);
      }
      case 'custom': {
        const oa = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const ob = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        return dir * (oa - ob);
      }
      default:
        return dir * ((a.kakeraValue ?? 0) - (b.kakeraValue ?? 0));
    }
  });

  if (search) return delay(rows.slice(0, 100));
  return delay(rows.slice(offset, offset + limit));
}

export async function fetchCharacterById(id: string): Promise<Character | null> {
  return delay(characters.find(c => c.characterId === id) ?? null);
}

export async function fetchCharacterImages(id: string): Promise<string[]> {
  const char = characters.find(c => c.characterId === id);
  const gallery = DEMO_GALLERIES[id];
  if (gallery?.length) return delay(gallery);
  return delay(char?.imageUrl ? [char.imageUrl] : []);
}

export async function fetchUserCharactersAll(discordId: string): Promise<Character[]> {
  const rows = characters
    .filter(c => c.userId === discordId)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return delay(rows);
}

export async function updateCharacterOrder(updates: { characterId: string; newOrder: number }[]) {
  const now = new Date().toISOString();
  for (const { characterId, newOrder } of updates) {
    const char = characters.find(c => c.characterId === characterId);
    if (char) {
      char.displayOrder = newOrder;
      char.orderUpdatedAt = now;
    }
  }
  return delay(undefined);
}

// ── Users ─────────────────────────────────────────────────────

function withCount(u: { discordId: string; discordUsername: string; discordAvatar?: string }): AppUser {
  return {
    ...u,
    characterCount: characters.filter(c => c.userId === u.discordId).length,
  };
}

export async function fetchUsers(): Promise<AppUser[]> {
  return delay(DEMO_USERS.map(withCount));
}

export async function fetchUserProfile(discordId: string) {
  const user = DEMO_USERS.find(u => u.discordId === discordId);
  return delay(user ? { ...user } : null);
}

export function buildAvatarUrl(_discordId: string, avatar?: string) {
  return avatar; // fixtures store full URLs
}

// ── Wishlist ──────────────────────────────────────────────────

export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const ids = [...(wishlists.get(userId) ?? [])];
  return delay(ids.map((characterId, i) => ({
    id: i,
    userId,
    characterId,
    addedAt: new Date().toISOString(),
  })));
}

export async function addToWishlist(userId: string, characterId: string) {
  if (!wishlists.has(userId)) wishlists.set(userId, new Set());
  wishlists.get(userId)!.add(characterId);
  return delay(undefined);
}

export async function removeFromWishlist(userId: string, characterId: string) {
  wishlists.get(userId)?.delete(characterId);
  return delay(undefined);
}

export async function fetchWishers(characterIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  for (const [userId, ids] of wishlists) {
    for (const characterId of ids) {
      if (!characterIds.includes(characterId)) continue;
      if (!result.has(characterId)) result.set(characterId, []);
      result.get(characterId)!.push(userId);
    }
  }
  return delay(result);
}
