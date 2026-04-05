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
        className="flex items-center gap-2 px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium rounded-full transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0 12.36 12.36 0 00-.617-1.23A.077.077 0 008.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028z"/>
        </svg>
        Login
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
