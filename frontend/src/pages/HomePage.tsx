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

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Mudae Web UI 
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
          Browse characters, manage your wishlist, and reorder your collection.
        </p>
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-300">Recently claimed</h2>
          <Link to="/collection" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <GridSkeleton count={18} gridClass={SIZE_GRIDS[cardSize]} />
        ) : (
          <div className={`grid ${SIZE_GRIDS[cardSize]} gap-2`}>
            {recent.map(char => (
              <CharacterCard key={char.characterId} character={char} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
