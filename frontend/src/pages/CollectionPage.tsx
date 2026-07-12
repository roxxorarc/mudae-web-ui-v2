import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCharacters, fetchUsers, fetchWishers } from '../db';
import type { Character, AppUser } from '../types';
import { CharacterCard } from '../components/CharacterCard';
import { GridSkeleton } from '../components/SkeletonLoader';
import { useStore, SIZE_GRIDS } from '../store';
import type { CardSize } from '../store';

const PAGE = 24;

type Sort = 'kakera' | 'recent' | 'name' | 'custom';
type Ownership = 'all' | 'owned' | 'available';

const SIZE_ICONS: Record<CardSize, string> = { sm: 'S', md: 'M', lg: 'L' };

function Segmented<T extends string>({ options, value, onChange, render }: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  render?: (v: T) => React.ReactNode;
}) {
  return (
    <div className="flex gap-0.5 bg-panel rounded-lg p-0.5 border border-line">
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors duration-150 ${
            value === o ? 'bg-kakera text-night' : 'text-muted hover:text-ink'
          }`}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

export default function CollectionPage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const { cardSize, setCardSize } = useStore();

  const [chars, setChars] = useState<Character[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [wishersMap, setWishersMap] = useState<Map<string, string[]>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, AppUser>>(new Map());

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<Sort>('kakera');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [ownership, setOwnership] = useState<Ownership>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    fetchUsers().then(list => {
      setUsers(list);
      setUserMap(new Map(list.map(u => [u.discordId, u])));
    }).catch(() => {});
  }, []);

  const loadPage = useCallback(async (reset: boolean) => {
    const offset = reset ? 0 : offsetRef.current;
    if (reset) { setLoading(true); setChars([]); }
    else setLoadingMore(true);

    try {
      const userId = routeUserId ?? (selectedUsers.length === 1 ? selectedUsers[0] : undefined);
      const owned = ownership === 'owned' ? true : ownership === 'available' ? false : undefined;

      const data = await fetchCharacters({ limit: PAGE, offset, sortBy: sort, sortOrder, userId, owned, search: debouncedSearch || undefined });
      const wishers = await fetchWishers(data.map(c => c.characterId));

      setChars(prev => reset ? data : [...prev, ...data]);
      setWishersMap(prev => {
        const next = new Map(prev);
        wishers.forEach((v, k) => next.set(k, v));
        return next;
      });
      setHasMore(data.length === PAGE && !debouncedSearch);
      offsetRef.current = offset + data.length;
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [routeUserId, selectedUsers, ownership, sort, sortOrder, debouncedSearch]);

  useEffect(() => {
    offsetRef.current = 0;
    loadPage(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, sortOrder, ownership, selectedUsers, debouncedSearch, routeUserId]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadPage(false);
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadPage]);

  const profileUser = useMemo(() => routeUserId ? userMap.get(routeUserId) : undefined, [routeUserId, userMap]);

  const toggleUser = useCallback((id: string) =>
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);

  const cycleSort = useCallback((next: Sort) => {
    if (sort === next) setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSort(next); setSortOrder('desc'); }
  }, [sort]);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      {/* Profile header */}
      {profileUser && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-panel rounded-xl border border-line animate-rise">
          {profileUser.discordAvatar
            ? <img src={profileUser.discordAvatar} alt={profileUser.discordUsername} className="w-14 h-14 rounded-lg ring-1 ring-line" />
            : <div className="w-14 h-14 rounded-lg bg-kakera-deep flex items-center justify-center text-white text-xl font-bold">{profileUser.discordUsername[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-ink">{profileUser.discordUsername}</h1>
            <p className="text-sm text-muted">{profileUser.characterCount.toLocaleString()} characters</p>
          </div>
          <Link
            to={`/wishlist/${routeUserId}`}
            className="flex items-center gap-2 px-4 py-2 bg-panel2 hover:bg-heart/15 border border-line hover:border-heart/50 rounded-lg text-sm font-semibold text-muted hover:text-heart transition-colors duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            Wishlist
          </Link>
        </div>
      )}

      {/* Filters bar */}
      <div className="sticky top-14 z-20 -mx-4 px-4 py-3 bg-night/90 backdrop-blur border-b border-line mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name or series…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-panel border border-line rounded-lg text-sm text-ink placeholder-muted focus:outline-none focus:border-kakera transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">✕</button>
            )}
          </div>

          {/* Sort */}
          <Segmented
            options={['kakera', 'recent', 'name', 'custom'] as const}
            value={sort}
            onChange={cycleSort}
            render={s => <>{s}{sort === s ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : ''}</>}
          />

          {/* Ownership */}
          {!routeUserId && (
            <Segmented
              options={['all', 'owned', 'available'] as const}
              value={ownership}
              onChange={setOwnership}
            />
          )}

          {/* Card size */}
          <div className="ml-auto">
            <Segmented
              options={['sm', 'md', 'lg'] as const}
              value={cardSize}
              onChange={setCardSize}
              render={s => SIZE_ICONS[s]}
            />
          </div>
        </div>

        {/* Player filter pills */}
        {!routeUserId && users.length > 0 && (
          <div className="flex gap-2 mt-2.5 overflow-x-auto scrollbar-hide pb-1">
            {users.map(u => (
              <button
                key={u.discordId}
                onClick={() => toggleUser(u.discordId)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 border ${
                  selectedUsers.includes(u.discordId)
                    ? 'bg-kakera/15 border-kakera/60 text-kakera'
                    : 'bg-panel border-line text-muted hover:text-ink'
                }`}
              >
                {u.discordAvatar && (
                  <img src={u.discordAvatar} alt="" className="w-4 h-4 rounded" />
                )}
                {u.discordUsername}
                <span className="font-mono opacity-60">{u.characterCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <GridSkeleton count={PAGE} gridClass={SIZE_GRIDS[cardSize]} />
      ) : chars.length === 0 ? (
        <div className="text-center py-24 animate-rise">
          <img src="/Kakera.webp" alt="" className="w-8 h-8 object-contain mx-auto mb-3 opacity-40" />
          <p className="text-muted">No characters match. Clear the search or filters to see more.</p>
        </div>
      ) : (
        <>
          <div className={`grid ${SIZE_GRIDS[cardSize]} gap-2.5`}>
            {chars.map((char, i) => (
              <CharacterCard
                key={char.characterId}
                character={char}
                userMap={userMap}
                wishers={wishersMap.get(char.characterId)}
                index={i < PAGE ? i : undefined}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-8" />
          {loadingMore && <GridSkeleton count={PAGE} gridClass={SIZE_GRIDS[cardSize]} />}
        </>
      )}
    </div>
  );
}
