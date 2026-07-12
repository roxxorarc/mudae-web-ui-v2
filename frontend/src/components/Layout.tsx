import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative h-14 -mb-px flex items-center px-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
          isActive
            ? 'border-kakera text-ink'
            : 'border-transparent text-muted hover:text-ink'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function UserMenu() {
  const { profile, signIn } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!profile) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-sm font-semibold transition-colors duration-200"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <span>Sign in with Discord</span>
      </button>
    );
  }

  const avatar = profile.discordAvatar;
  const name = profile.discordUsername || 'User';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 bg-panel hover:bg-panel2 rounded-lg transition-colors border border-line"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-7 h-7 rounded-md" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-md bg-kakera-deep flex items-center justify-center text-white text-xs font-bold">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-sm text-ink font-semibold hidden sm:block">{name}</span>
        <svg className={`w-3 h-3 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-panel border border-line rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-in">
            <div className="px-4 py-3 border-b border-line">
              <p className="text-sm font-bold text-ink truncate">{name}</p>
              <p className="text-xs text-muted truncate">Demo session — nothing is saved</p>
            </div>
            <div className="py-1">
              <MenuBtn
                icon={<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>}
                label="My wishlist"
                onClick={() => { navigate('/wishlist'); setOpen(false); }}
              />
              <MenuBtn
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>}
                label="Reorder characters"
                onClick={() => { navigate('/character-order'); setOpen(false); }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
        danger ? 'text-red-400 hover:bg-red-400/10' : 'text-muted hover:text-ink hover:bg-panel2'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-night text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-night/85 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 mr-3 shrink-0">
            <img src="/Mudae.webp" alt="" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-display font-bold text-lg tracking-wide text-ink">
              MUDAE
            </span>
            <span className="font-display text-xs text-kakera font-semibold mt-0.5 hidden sm:block">UI</span>
            <span className="ml-1 px-1.5 py-0.5 rounded border border-gold/50 bg-gold/10 text-gold font-mono text-[10px] font-bold tracking-wider">
              DEMO
            </span>
          </NavLink>

          <nav className="flex items-center self-stretch">
            <NavItem to="/" label="Home" end />
            <NavItem to="/collection" label="Collection" />
            <NavItem to="/users" label="Players" />
          </nav>

          <div className="flex-1" />

          <UserMenu />
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
