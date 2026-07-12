import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCharacters } from '../db';
import type { Character } from '../types';
import { CharacterCard } from '../components/CharacterCard';
import { GridSkeleton } from '../components/SkeletonLoader';
import { useStore, SIZE_GRIDS } from '../store';

export default function HomePage() {
  const { cardSize } = useStore();
  const [recent, setRecent] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCharacters({ limit: 18, sortBy: 'recent', sortOrder: 'desc', owned: true })
      .then(setRecent)
      .finally(() => setLoading(false));
  }, []);

  const latest = recent[0];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-12 max-w-3xl animate-rise">
        <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] text-ink mb-5">
          Every claim on the server, in one place.
        </h1>
        <p className="text-muted text-lg mb-7 max-w-xl">
          Browse the full collection, keep a wishlist, and arrange your harem.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/collection"
            className="px-5 py-2.5 bg-kakera hover:bg-kakera-deep text-night hover:text-white rounded-lg text-sm font-bold transition-colors duration-200"
          >
            Browse collection
          </Link>
          <Link
            to="/users"
            className="px-5 py-2.5 bg-panel hover:bg-panel2 border border-line text-ink rounded-lg text-sm font-semibold transition-colors duration-200"
          >
            Players
          </Link>
        </div>
        {latest && (
          <p className="font-mono text-xs text-muted mt-7">
            <span className="text-kakera font-bold">Latest claim</span>
            {' · '}
            <Link to={`/character/${latest.characterId}`} className="text-ink hover:text-kakera transition-colors">
              {latest.name}
            </Link>
            {latest.series ? <span> — {latest.series}</span> : null}
          </p>
        )}
      </div>

      {/* Recent claims */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-ink">Recently claimed</h2>
          <Link to="/collection" className="text-sm font-semibold text-kakera hover:text-ink transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <GridSkeleton count={18} gridClass={SIZE_GRIDS[cardSize]} />
        ) : recent.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-line rounded-xl animate-rise">
            <img src="/Kakera.webp" alt="" className="w-8 h-8 object-contain mx-auto mb-3 opacity-40" />
            <p className="text-muted">No claims recorded yet. They appear here as the bot logs them.</p>
          </div>
        ) : (
          <div className={`grid ${SIZE_GRIDS[cardSize]} gap-2.5`}>
            {recent.map((char, i) => (
              <CharacterCard key={char.characterId} character={char} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
