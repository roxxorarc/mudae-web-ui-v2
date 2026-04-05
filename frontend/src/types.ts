export interface Character {
  userId: string;
  characterId: string;
  name: string;
  series?: string;
  imageUrl?: string;
  kakeraValue?: number;
  addedAt: string;
  claimedAt?: string;
  displayOrder?: number;
  orderUpdatedAt?: string;
}

export interface AppUser {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  characterCount: number;
}

export interface WishlistItem {
  id: number;
  userId: string;
  characterId: string;
  addedAt: string;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

const THRESHOLDS = { uncommon: 100, rare: 250, epic: 500, legendary: 1000 };

export function getRarity(kakeraValue: number | undefined): Rarity {
  if (!kakeraValue) return 'common';
  if (kakeraValue >= THRESHOLDS.legendary) return 'legendary';
  if (kakeraValue >= THRESHOLDS.epic) return 'epic';
  if (kakeraValue >= THRESHOLDS.rare) return 'rare';
  if (kakeraValue >= THRESHOLDS.uncommon) return 'uncommon';
  return 'common';
}

export const RARITY = {
  common:    { border: 'border-gray-700',    shadow: '',                          badge: 'bg-gray-700 text-gray-300',    label: 'Common' },
  uncommon:  { border: 'border-emerald-500', shadow: 'shadow-emerald-500/40',     badge: 'bg-emerald-900 text-emerald-300', label: 'Uncommon' },
  rare:      { border: 'border-blue-500',    shadow: 'shadow-blue-500/40',        badge: 'bg-blue-900 text-blue-300',    label: 'Rare' },
  epic:      { border: 'border-purple-500',  shadow: 'shadow-purple-500/40',      badge: 'bg-purple-900 text-purple-300', label: 'Epic' },
  legendary: { border: 'border-yellow-400',  shadow: 'shadow-yellow-400/50',      badge: 'bg-yellow-900 text-yellow-300', label: 'Legendary' },
} satisfies Record<Rarity, { border: string; shadow: string; badge: string; label: string }>;
