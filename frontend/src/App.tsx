import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { StoreProvider } from './store';
import { Layout } from './components/Layout';
import { GridSkeleton } from './components/SkeletonLoader';

const Home           = lazy(() => import('./pages/HomePage'));
const Collection     = lazy(() => import('./pages/CollectionPage'));
const Wishlist       = lazy(() => import('./pages/WishlistPage'));
const CharacterDetail= lazy(() => import('./pages/CharacterDetailPage'));
const CharacterOrder = lazy(() => import('./pages/CharacterOrderPage'));
const Users          = lazy(() => import('./pages/UsersPage'));

const Loader = () => (
  <div className="max-w-screen-2xl mx-auto px-4 py-12">
    <GridSkeleton count={24} />
  </div>
);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="collection" element={<Collection />} />
            <Route path="user/:userId" element={<Collection />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="wishlist/:userId" element={<Wishlist />} />
            <Route path="users" element={<Users />} />
            <Route path="character/:characterId" element={<CharacterDetail />} />
            <Route
              path="character-order"
              element={<AuthGate><CharacterOrder /></AuthGate>}
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppRoutes />
      </StoreProvider>
    </AuthProvider>
  );
}
