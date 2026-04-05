import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCharacterById, fetchWishers, fetchUserProfile, supabase } from '../db';
import { useStore } from '../store';
import type { Character } from '../types';
import { getRarity, RARITY } from '../types';

interface PersonInfo { id: string; username?: string; avatar?: string }

function PersonPill({ p, href }: { p: PersonInfo; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-blue-900/40 border border-gray-700 hover:border-blue-500/50 rounded-full text-xs text-gray-300 transition-colors"
    >
      {p.avatar ? (
        <img src={p.avatar} alt={p.username} className="w-4 h-4 rounded-full" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center text-white text-[8px] font-bold">
          {(p.username || '?')[0].toUpperCase()}
        </div>
      )}
      {p.username || p.id.slice(0, 8)}
    </Link>
  );
}

export default function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { isWished, toggleWish } = useStore();

  const [char, setChar] = useState<Character | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imgLoadErrors, setImgLoadErrors] = useState<Set<number>>(new Set());
  const [wishers, setWishers] = useState<PersonInfo[]>([]);
  const [owner, setOwner] = useState<PersonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [wishing, setWishing] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!characterId) return;
    setLoading(true);
    setImages([]);
    setImgLoadErrors(new Set());
    setWishers([]);
    setOwner(null);

    Promise.all([
      fetchCharacterById(characterId),
      fetchWishers([characterId]),
    ]).then(async ([c, wishersMap]) => {
      setChar(c);

      // Load wishers
      const wisherIds = wishersMap.get(characterId) || [];
      const wisherProfiles = await Promise.allSettled(wisherIds.map(id => fetchUserProfile(id)));
      setWishers(wisherIds.map((id, i) => {
        const p = wisherProfiles[i].status === 'fulfilled' ? wisherProfiles[i].value : null;
        return { id, username: p?.discordUsername, avatar: p?.discordAvatar };
      }));

      // Load owner profile
      if (c?.userId) {
        fetchUserProfile(c.userId)
          .then(p => { if (p) setOwner({ id: p.discordId, username: p.discordUsername, avatar: p.discordAvatar }); })
          .catch(() => {});
      }

      // Load gallery images
      if (c?.characterId) {
        setImagesLoading(true);
        supabase.functions.invoke('get-character-images', { body: { characterId: c.characterId } })
          .then(({ data }) => { if (data?.images) setImages(data.images); })
          .catch(() => {})
          .finally(() => setImagesLoading(false));
      }
    }).finally(() => setLoading(false));
  }, [characterId]);

  const copyImage = async (idx: number) => {
    if (!char) return;
    await navigator.clipboard.writeText(`$changeimg ${char.name}$${idx + 1}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleWish = async () => {
    if (!characterId || wishing) return;
    setWishing(true);
    await toggleWish(characterId);
    setWishing(false);
  };

  if (loading) {
    return (
      <div className="max-w-screen-lg mx-auto px-4 py-12 animate-pulse">
        <div className="flex gap-8">
          <div className="w-48 h-72 bg-gray-800 rounded-xl shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-800 rounded w-1/2" />
            <div className="h-4 bg-gray-800 rounded w-1/3" />
            <div className="h-20 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="max-w-screen-lg mx-auto px-4 py-24 text-center">
        <p className="text-gray-400 mb-4">Character not found.</p>
        <Link to="/collection" className="text-blue-400 hover:text-blue-300">← Collection</Link>
      </div>
    );
  }

  const rarity = getRarity(char.kakeraValue);
  const { border, shadow, badge } = RARITY[rarity];
  const wished = isWished(char.characterId);
  const initials = char.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <Link to={-1 as unknown as string} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Main info */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        {/* Card */}
        <div className={`relative w-40 sm:w-48 shrink-0 rounded-xl overflow-hidden border-2 ${border} ${shadow ? `shadow-xl ${shadow}` : ''}`}>
          {char.imageUrl ? (
            <img src={char.imageUrl} alt={char.name} className="w-full aspect-[2/3] object-cover"
              referrerPolicy="no-referrer"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-800 flex flex-col items-center justify-center gap-1 p-3">
              <span className="text-3xl font-black text-gray-500">{initials}</span>
              <span className="text-[10px] text-gray-600 text-center">{char.name}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-black text-white">{char.name}</h1>
            {char.kakeraValue && (
              <span className={`mt-1.5 flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${badge}`}>
                <img src="/Kakera.webp" alt="kakera" className="w-4 h-4 object-contain" />
                {char.kakeraValue}
              </span>
            )}
          </div>

          {char.series && <p className="text-gray-400 text-lg mt-1">{char.series}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={handleWish}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                wished
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30 hover:bg-pink-700'
                  : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-pink-500 hover:text-pink-400'
              } ${wishing ? 'opacity-60' : ''}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={wished ? 0 : 1.5}>
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {wished ? 'In Wishlist' : 'Add to Wishlist'}
            </button>

            {owner && (
              <div className="flex items-center gap-1.5 text-m text-gray-400">
                <span className="text-gray-600">owned by</span>
                <PersonPill p={owner} href={`/user/${owner.id}`} />
              </div>
            )}
            {!owner && char.userId && (
              <span className="text-xs text-gray-600">Loading owner…</span>
            )}
          </div>

          {/* Wishers */}
          {wishers.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Wishlisted by</p>
              <div className="flex flex-wrap gap-2">
                {wishers.map(w => (
                  <PersonPill key={w.id} p={w} href={`/wishlist/${w.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-gray-500">
            {char.claimedAt && (
              <div>
                <span className="uppercase tracking-wider block mb-0.5">Claimed</span>
                <span className="text-gray-300">{new Date(char.claimedAt).toLocaleDateString()}</span>
              </div>
            )}
            {char.addedAt && (
              <div>
                <span className="uppercase tracking-wider block mb-0.5">Added</span>
                <span className="text-gray-300">{new Date(char.addedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Images{' '}
            {!imagesLoading && images.length > 0 && (
              <span className="text-gray-500 text-sm font-normal">({images.length})</span>
            )}
          </h2>
          {images.length > 0 && (
            <p className="text-xs text-gray-500">Click to expand · hover for <code className="bg-gray-800 px-1 py-0.5 rounded">$changeimg</code></p>
          )}
        </div>

        {/* Skeleton while loading */}
        {imagesLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Gallery */}
        {!imagesLoading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {images.map((url, i) => (
              <div
                key={i}
                className="relative group animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: 'both' }}
              >
                <button
                  onClick={() => setModalIdx(i)}
                  className="w-full rounded-xl overflow-hidden border-2 border-gray-700 hover:border-blue-500 aspect-[2/3] transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-500/20 block"
                >
                  {!imgLoadErrors.has(i) ? (
                    <img
                      src={url}
                      alt={`${char.name} #${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setImgLoadErrors(prev => new Set([...prev, i]))}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                      #{i + 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => copyImage(i)}
                  className={`absolute bottom-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-150 ${
                    copiedIdx === i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-black/70 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {copiedIdx === i ? 'Copied!' : `#${i + 1}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {!imagesLoading && images.length === 0 && (
          <p className="text-gray-600 text-sm">No images found.</p>
        )}
      </div>

      {/* Lightbox modal */}
      {modalIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setModalIdx(null)}
          onKeyDown={e => {
            if (e.key === 'Escape') setModalIdx(null);
            if (e.key === 'ArrowRight') setModalIdx(i => i !== null ? Math.min(i + 1, images.length - 1) : null);
            if (e.key === 'ArrowLeft') setModalIdx(i => i !== null ? Math.max(i - 1, 0) : null);
          }}
          tabIndex={0}
          autoFocus
        >
          {modalIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setModalIdx(modalIdx - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {modalIdx < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setModalIdx(modalIdx + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <img
            src={images[modalIdx]}
            alt={`${char.name} #${modalIdx + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-sm text-gray-400">{modalIdx + 1} / {images.length}</span>
            <button
              onClick={() => setModalIdx(null)}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={e => { e.stopPropagation(); copyImage(modalIdx); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                copiedIdx === modalIdx ? 'bg-emerald-500 text-white' : 'bg-gray-900/80 text-gray-300 hover:bg-blue-600 hover:text-white'
              }`}
            >
              {copiedIdx === modalIdx ? 'Copied!' : `Copy $changeimg ${char.name}$${modalIdx + 1}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
