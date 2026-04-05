import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './auth';
import { fetchWishlist, addToWishlist, removeFromWishlist } from './db';

export type CardSize = 'sm' | 'md' | 'lg';

export const SIZE_GRIDS: Record<CardSize, string> = {
  sm: 'grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-13',
  md: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
  lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
};

const VALID_SIZES: CardSize[] = ['sm', 'md', 'lg'];
function loadCardSize(): CardSize {
  const v = localStorage.getItem('card_size');
  return VALID_SIZES.includes(v as CardSize) ? (v as CardSize) : 'md';
}

interface StoreState {
  wishlist: Set<string>;
  wishlistLoading: boolean;
  cardSize: CardSize;
}

type Action =
  | { type: 'SET_WISHLIST'; ids: string[] }
  | { type: 'ADD'; id: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'WISHLIST_LOADING'; loading: boolean }
  | { type: 'SET_CARD_SIZE'; size: CardSize };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_WISHLIST':
      return { ...state, wishlist: new Set(action.ids), wishlistLoading: false };
    case 'ADD': {
      const next = new Set(state.wishlist);
      next.add(action.id);
      return { ...state, wishlist: next };
    }
    case 'REMOVE': {
      const next = new Set(state.wishlist);
      next.delete(action.id);
      return { ...state, wishlist: next };
    }
    case 'WISHLIST_LOADING':
      return { ...state, wishlistLoading: action.loading };
    case 'SET_CARD_SIZE':
      return { ...state, cardSize: action.size };
  }
}

interface StoreCtx {
  wishlist: Set<string>;
  wishlistLoading: boolean;
  cardSize: CardSize;
  isWished: (id: string) => boolean;
  toggleWish: (id: string) => Promise<void>;
  setCardSize: (size: CardSize) => void;
}

const StoreContext = createContext<StoreCtx | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    wishlist: new Set<string>(),
    wishlistLoading: false,
    cardSize: loadCardSize(),
  }));

  // Persist card size outside reducer (no side effects in reducers)
  useEffect(() => {
    localStorage.setItem('card_size', state.cardSize);
  }, [state.cardSize]);

  useEffect(() => {
    if (!profile?.discordId) {
      dispatch({ type: 'SET_WISHLIST', ids: [] });
      return;
    }
    dispatch({ type: 'WISHLIST_LOADING', loading: true });
    fetchWishlist(profile.discordId)
      .then(items => dispatch({ type: 'SET_WISHLIST', ids: items.map(i => i.characterId) }))
      .catch(() => dispatch({ type: 'WISHLIST_LOADING', loading: false }));
  }, [profile?.discordId]);

  const isWished = useCallback((id: string) => state.wishlist.has(id), [state.wishlist]);

  const toggleWish = useCallback(async (id: string) => {
    if (!profile?.discordId) return;
    if (state.wishlist.has(id)) {
      dispatch({ type: 'REMOVE', id });
      await removeFromWishlist(profile.discordId, id).catch(() => dispatch({ type: 'ADD', id }));
    } else {
      dispatch({ type: 'ADD', id });
      await addToWishlist(profile.discordId, id).catch(() => dispatch({ type: 'REMOVE', id }));
    }
  }, [profile?.discordId, state.wishlist]);

  const setCardSize = useCallback((size: CardSize) => dispatch({ type: 'SET_CARD_SIZE', size }), []);

  return (
    <StoreContext.Provider value={{ ...state, isWished, toggleWish, setCardSize }}>
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
