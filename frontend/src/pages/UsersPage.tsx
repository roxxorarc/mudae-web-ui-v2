import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers } from '../db';
import type { AppUser } from '../types';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => search ? users.filter(u => u.discordUsername.toLowerCase().includes(search.toLowerCase())) : users,
    [users, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-1">{users.length} players</p>
        </div>
        <div className="relative w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500">No users found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(u => (
            <Link
              key={u.discordId}
              to={`/user/${u.discordId}`}
              className="group flex items-center gap-4 p-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-blue-500/40 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
            >
              {u.discordAvatar ? (
                <img
                  src={u.discordAvatar}
                  alt={u.discordUsername}
                  className="w-12 h-12 rounded-full ring-2 ring-gray-700 group-hover:ring-blue-500/50 transition-all shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {u.discordUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold truncate group-hover:text-blue-300 transition-colors">
                  {u.discordUsername}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {u.characterCount.toLocaleString()} characters
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
