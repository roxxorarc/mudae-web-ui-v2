import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers } from '../db';
import type { AppUser } from '../types';

// Rank color: the podium gets metal, everyone else gets mono ink.
function rankClass(i: number) {
  if (i === 0) return 'text-gold';
  if (i === 1) return 'text-ink';
  if (i === 2) return 'text-kakera';
  return 'text-muted/60';
}

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(
    () => [...users].sort((a, b) => b.characterCount - a.characterCount),
    [users]
  );

  const filtered = useMemo(
    () => search ? ranked.filter(u => u.discordUsername.toLowerCase().includes(search.toLowerCase())) : ranked,
    [ranked, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 animate-rise">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Players</h1>
          <p className="text-sm text-muted mt-1">{users.length} players, ranked by claims</p>
        </div>
        <div className="relative w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-panel border border-line rounded-lg text-sm text-ink placeholder-muted focus:outline-none focus:border-kakera transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-panel border border-line rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted">No players match that name.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((u, i) => {
            const rank = ranked.indexOf(u);
            return (
              <Link
                key={u.discordId}
                to={`/user/${u.discordId}`}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                className="group flex items-center gap-3 p-4 bg-panel hover:bg-panel2 border border-line hover:border-kakera/60 rounded-xl transition-all duration-200 hover:-translate-y-0.5 animate-rise"
              >
                <span className={`font-display font-bold text-lg w-8 text-right shrink-0 tabular-nums ${rankClass(rank)}`}>
                  {rank + 1}
                </span>
                {u.discordAvatar ? (
                  <img
                    src={u.discordAvatar}
                    alt=""
                    className="w-11 h-11 rounded-lg ring-1 ring-line group-hover:ring-kakera/50 transition-all shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-kakera-deep flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {u.discordUsername[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-semibold truncate group-hover:text-kakera transition-colors">
                    {u.discordUsername}
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    {u.characterCount.toLocaleString()} characters
                  </p>
                </div>
                <svg className="w-4 h-4 text-muted/50 group-hover:text-kakera transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
