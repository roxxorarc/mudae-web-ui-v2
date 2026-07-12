import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWishlist, fetchCharacterById, fetchUserProfile } from '../db';
import { useAuth } from '../auth';
import { useStore, SIZE_GRIDS } from '../store';
import type { Character } from '../types';
import { CharacterCard } from '../components/CharacterCard';
import { GridSkeleton } from '../components/SkeletonLoader';

const HEART_PATH = 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z';

export default function WishlistPage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { profile } = useAuth();
  const { cardSize } = useStore();

  const targetId = routeUserId || profile?.discordId;
  const isOwn = !routeUserId || routeUserId === profile?.discordId;

  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }

    setLoading(true);

    if (!isOwn) {
      fetchUserProfile(targetId).then(p => setOwnerName(p?.discordUsername || null)).catch(() => {});
    }

    fetchWishlist(targetId).then(async items => {
      const chars = await Promise.all(
        items.map(item => fetchCharacterById(item.characterId).catch(() => null))
      );
      setChars(chars.filter(Boolean) as Character[]);
    }).finally(() => setLoading(false));
  }, [targetId, isOwn]);

  if (!targetId) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-24 text-center animate-rise">
        <svg className="w-8 h-8 text-heart/50 mx-auto mb-3" viewBox="0 0 20 20" fill="currentColor">
          <path d={HEART_PATH} />
        </svg>
        <p className="text-muted mb-4">Sign in with Discord to see your wishlist.</p>
        <Link to="/" className="text-sm font-semibold text-kakera hover:text-ink transition-colors">← Go home</Link>
      </div>
    );
  }

  const title = isOwn ? 'My wishlist' : `${ownerName ?? '…'}'s wishlist`;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 animate-rise">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-heart" viewBox="0 0 20 20" fill="currentColor">
            <path d={HEART_PATH} />
          </svg>
          <div>
            <h1 className="font-display font-bold text-2xl text-ink">{title}</h1>
            {!loading && (
              <p className="text-sm text-muted mt-0.5">{chars.length} character{chars.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <Link to={-1 as unknown as string} className="text-sm font-semibold text-muted hover:text-ink transition-colors">← Back</Link>
      </div>

      {loading ? (
        <GridSkeleton count={12} gridClass={SIZE_GRIDS[cardSize]} />
      ) : chars.length === 0 ? (
        <div className="text-center py-24 animate-rise">
          <svg className="w-8 h-8 text-heart/40 mx-auto mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path d={HEART_PATH} />
          </svg>
          <p className="text-muted text-lg">
            {isOwn ? 'Nothing wished yet. Tap the heart on any character to add it here.' : 'No characters wished yet.'}
          </p>
        </div>
      ) : (
        <div className={`grid ${SIZE_GRIDS[cardSize]} gap-2.5`}>
          {chars.map((char, i) => (
            <CharacterCard key={char.characterId} character={char} hideWish={!isOwn} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
