import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCharacterById, fetchWishers, fetchUserProfile } from '../db';
import { apiFetch } from '../api';
import { useStore } from '../store';
import type { Character } from '../types';
import { getRarity, RARITY } from '../types';

interface PersonInfo { id: string; username?: string; avatar?: string }

function PersonPill({ p, href }: { p: PersonInfo; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-panel hover:bg-panel2 border border-line hover:border-kakera/60 rounded-lg text-xs font-semibold text-muted hover:text-ink transition-colors"
    >
      {p.avatar ? (
        <img src={p.avatar} alt="" className="w-4 h-4 rounded" />
      ) : (
        <div className="w-4 h-4 rounded bg-kakera-deep flex items-center justify-center text-white text-[8px] font-bold">
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
        apiFetch<{ images?: string[] }>(`/api/characters/${c.characterId}/images`)
          .then(data => { if (data?.images) setImages(data.images); })
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
          <div className="w-48 h-72 bg-panel border border-line rounded-xl shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-panel rounded w-1/2" />
            <div className="h-4 bg-panel rounded w-1/3" />
            <div className="h-20 bg-panel rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="max-w-screen-lg mx-auto px-4 py-24 text-center animate-rise">
        <img src="/Kakera.webp" alt="" className="w-8 h-8 object-contain mx-auto mb-3 opacity-40" />
        <p className="text-muted mb-4">Character not found.</p>
        <Link to="/collection" className="text-sm font-semibold text-kakera hover:text-ink transition-colors">← Collection</Link>
      </div>
    );
  }

  const rarity = getRarity(char.kakeraValue);
  const { edge, badge, label } = RARITY[rarity];
  const wished = isWished(char.characterId);
  const initials = char.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-8">
      <Link to={-1 as unknown as string} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Main info */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10 animate-rise">
        {/* Card */}
        <div className={`relative w-40 sm:w-48 shrink-0 rounded-xl overflow-hidden border bg-panel ${edge}`}>
          {char.imageUrl ? (
            <img src={char.imageUrl} alt={char.name} className="w-full aspect-[2/3] object-cover"
              referrerPolicy="no-referrer"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full aspect-[2/3] flex flex-col items-center justify-center gap-1 p-3">
              <span className="text-3xl font-display font-bold text-muted/50">{initials}</span>
              <span className="text-[10px] text-muted/70 text-center">{char.name}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink">{char.name}</h1>
            {char.kakeraValue && (
              <span className={`${badge} mt-2 !text-sm !px-2.5 !py-1`} title={label}>
                <img src="/Kakera.webp" alt="kakera" className="w-4 h-4 object-contain" />
                {char.kakeraValue}
              </span>
            )}
          </div>

          {char.series && <p className="text-muted text-lg mt-1">{char.series}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={handleWish}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors duration-200 ${
                wished
                  ? 'bg-heart text-night hover:bg-heart/85'
                  : 'bg-panel border border-line text-muted hover:border-heart/60 hover:text-heart'
              } ${wishing ? 'opacity-60' : ''}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={wished ? 0 : 1.5}>
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {wished ? 'In wishlist' : 'Add to wishlist'}
            </button>

            {owner && (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <span className="text-muted/60">claimed by</span>
                <PersonPill p={owner} href={`/user/${owner.id}`} />
              </div>
            )}
            {!owner && char.userId && (
              <span className="text-xs text-muted/60">Loading owner…</span>
            )}
          </div>

          {/* Wishers */}
          {wishers.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-bold text-heart uppercase tracking-wider mb-2">Wished by</p>
              <div className="flex flex-wrap gap-2">
                {wishers.map(w => (
                  <PersonPill key={w.id} p={w} href={`/wishlist/${w.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-muted">
            {char.claimedAt && (
              <div>
                <span className="uppercase tracking-wider block mb-0.5 text-muted/60">Claimed</span>
                <span className="text-ink font-mono">{new Date(char.claimedAt).toLocaleDateString()}</span>
              </div>
            )}
            {char.addedAt && (
              <div>
                <span className="uppercase tracking-wider block mb-0.5 text-muted/60">Added</span>
                <span className="text-ink font-mono">{new Date(char.addedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-ink">
            Images{' '}
            {!imagesLoading && images.length > 0 && (
              <span className="text-muted text-sm font-body font-normal">({images.length})</span>
            )}
          </h2>
          {images.length > 0 && (
            <p className="text-xs text-muted">Click to expand · hover to copy <span className="cmd">$changeimg</span></p>
          )}
        </div>

        {/* Skeleton while loading */}
        {imagesLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-panel border border-line animate-pulse" />
            ))}
          </div>
        )}

        {/* Gallery */}
        {!imagesLoading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {images.map((url, i) => (
              <div
                key={i}
                className="relative group animate-rise"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <button
                  onClick={() => setModalIdx(i)}
                  className="w-full rounded-xl overflow-hidden border border-line hover:border-kakera aspect-[2/3] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50 block bg-panel"
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
                    <div className="w-full h-full flex items-center justify-center text-muted/60 font-mono text-xs">
                      #{i + 1}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-night/0 group-hover:bg-night/40 transition-colors duration-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-ink opacity-0 group-hover:opacity-90 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => copyImage(i)}
                  className={`absolute bottom-1.5 right-1.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md transition-all duration-150 ${
                    copiedIdx === i
                      ? 'bg-emerald-400 text-night'
                      : 'bg-night/80 text-muted opacity-0 group-hover:opacity-100 hover:bg-kakera hover:text-night'
                  }`}
                >
                  {copiedIdx === i ? 'Copied' : `#${i + 1}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {!imagesLoading && images.length === 0 && (
          <p className="text-muted/70 text-sm">No images found for this character.</p>
        )}
      </div>

      {/* Lightbox modal */}
      {modalIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/95 backdrop-blur-sm animate-fade-in"
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
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-panel hover:bg-panel2 border border-line flex items-center justify-center text-ink transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {modalIdx < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setModalIdx(modalIdx + 1); }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-panel hover:bg-panel2 border border-line flex items-center justify-center text-ink transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <img
            src={images[modalIdx]}
            alt={`${char.name} #${modalIdx + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl shadow-black/60"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="font-mono text-sm text-muted">{modalIdx + 1} / {images.length}</span>
            <button
              onClick={() => setModalIdx(null)}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-panel hover:bg-panel2 border border-line flex items-center justify-center text-ink transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button
              onClick={e => { e.stopPropagation(); copyImage(modalIdx); }}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-colors ${
                copiedIdx === modalIdx ? 'bg-emerald-400 text-night' : 'bg-panel border border-line text-muted hover:bg-kakera hover:text-night hover:border-kakera'
              }`}
            >
              {copiedIdx === modalIdx ? 'Copied' : `Copy $changeimg ${char.name}$${modalIdx + 1}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
