// Demo auth: the visitor is always signed in as the demo user.
// signIn/signOut are no-ops — this build has no backend.
import { createContext, useContext } from 'react';
import { DEMO_USER_ID, DEMO_USERS } from './demo/data';

interface UserProfile {
  discordId: string;
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

const demoUser = DEMO_USERS.find(u => u.discordId === DEMO_USER_ID)!;

const DEMO_CTX: AuthCtx = {
  profile: {
    discordId: demoUser.discordId,
    discordUsername: demoUser.discordUsername,
    discordAvatar: demoUser.discordAvatar,
  },
  loading: false,
  signIn: () => {},
  signOut: async () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={DEMO_CTX}>
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
