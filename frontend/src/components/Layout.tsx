import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';


function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function UserMenu() {
  const { user, profile, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
      <span>Login with Discord</span>
    </button>
    );
  }

  const avatar = user.user_metadata?.avatar_url as string | undefined;
  const name = profile?.discordUsername || user.user_metadata?.full_name || 'User';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors border border-gray-700"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-sm text-white font-medium hidden sm:block">{name}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || 'Discord'}</p>
            </div>
            <div className="py-1">
              <MenuBtn icon="♥" label="My Wishlist" onClick={() => { navigate('/wishlist'); setOpen(false); }} />
              <MenuBtn icon="⇅" label="Reorder" onClick={() => { navigate('/character-order'); setOpen(false); }} />
              <div className="border-t border-gray-800 my-1" />
              <MenuBtn icon="→" label="Sign out" danger onClick={() => { signOut(); setOpen(false); }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-red-950/30' : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-[#15162a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl bg-[#15162a]/80">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 mr-2 shrink-0">
            <img src="/Mudae.webp" alt="Mudae" className="w-6 h-6 object-contain" />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Mudae
            </span>
            <span className="text-sm text-gray-500 font-medium hidden sm:block">UI</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavItem to="/" label="Home" end />
            <NavItem to="/collection" label="Collection" />
            <NavItem to="/users" label="Users" />
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
