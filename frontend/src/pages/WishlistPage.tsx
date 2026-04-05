import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWishlist, fetchCharacterById, fetchUserProfile } from '../db';
import { useAuth } from '../auth';
import { useStore, SIZE_GRIDS } from '../store';
import type { Character } from '../types';
import { CharacterCard } from '../components/CharacterCard';
import { GridSkeleton } from '../components/SkeletonLoader';

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
      <div className="max-w-screen-2xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 mb-4">Sign in to see your wishlist.</p>
        <Link to="/" className="text-blue-400 hover:text-blue-300">← Go home</Link>
      </div>
    );
  }

  const title = isOwn ? 'My Wishlist' : `${ownerName ?? '...'}'s Wishlist`;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-1">{chars.length} character{chars.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Link to={-1 as unknown as string} className="text-sm text-gray-400 hover:text-white transition-colors">← Back</Link>
      </div>

      {loading ? (
        <GridSkeleton count={12} gridClass={SIZE_GRIDS[cardSize]} />
      ) : chars.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-500 text-lg">
            {isOwn ? 'Your wishlist is empty. Heart characters to add them!' : 'No characters wishlisted yet.'}
          </p>
        </div>
      ) : (
        <div className={`grid ${SIZE_GRIDS[cardSize]} gap-2`}>
          {chars.map(char => (
            <CharacterCard key={char.characterId} character={char} hideWish={!isOwn} />
          ))}
        </div>
      )}
    </div>
  );
}
