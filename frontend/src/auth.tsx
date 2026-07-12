import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, apiUrl } from './api';
import { buildAvatarUrl } from './db';

interface UserProfile {
  discordId: string;  // Discord snowflake ID
  discordUsername?: string;
  discordAvatar?: string;
}

interface AuthCtx {
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ discordId: string; discordUsername?: string; discordAvatar?: string }>('/api/auth/me')
      .then(data => {
        setProfile({
          discordId: data.discordId,
          discordUsername: data.discordUsername,
          discordAvatar: buildAvatarUrl(data.discordId, data.discordAvatar),
        });
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = () => {
    window.location.href = apiUrl('/api/auth/login');
  };

  const signOut = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
