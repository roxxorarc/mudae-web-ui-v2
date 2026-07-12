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

// edge = card border accent, badge = kakera chip tier class (see index.css)
export const RARITY = {
  common:    { edge: 'edge-common',    badge: 'chip rarity-common',    label: 'Common' },
  uncommon:  { edge: 'edge-uncommon',  badge: 'chip rarity-uncommon',  label: 'Uncommon' },
  rare:      { edge: 'edge-rare',      badge: 'chip rarity-rare',      label: 'Rare' },
  epic:      { edge: 'edge-epic',      badge: 'chip rarity-epic',      label: 'Epic' },
  legendary: { edge: 'edge-legendary', badge: 'chip rarity-legendary', label: 'Legendary' },
} satisfies Record<Rarity, { edge: string; badge: string; label: string }>;
