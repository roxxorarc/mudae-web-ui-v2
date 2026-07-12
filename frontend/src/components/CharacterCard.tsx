import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Character, AppUser } from '../types';
import { getRarity, RARITY } from '../types';
import { useStore } from '../store';

interface Props {
  character: Character;
  userMap?: Map<string, AppUser>;
  wishers?: string[];
  compact?: boolean;
  dragging?: boolean;
  displayOrder?: number;
  hideWish?: boolean;
  index?: number; // grid position, drives the staggered rise-in
}

const HEART_PATH = 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z';

// Unified avatar — sm = card owner, md = tooltip wisher
function UserAvatar({ user, variant = 'sm' }: { user?: AppUser; variant?: 'sm' | 'md' }) {
  const [err, setErr] = useState(false);

  if (variant === 'sm') {
    return user?.discordAvatar && !err ? (
      <img
        src={user.discordAvatar}
        alt={user.discordUsername}
        className="w-5 h-5 rounded-full object-cover ring-1 ring-line"
        onError={() => setErr(true)}
      />
    ) : (
      <div className="w-5 h-5 rounded-full bg-kakera-deep flex items-center justify-center text-white font-bold" style={{ fontSize: 9 }}>
        {(user?.discordUsername || '?')[0]?.toUpperCase()}
      </div>
    );
  }

  // md: tooltip wisher
  return (
    <div className="w-7 h-7 rounded-full ring-2 ring-heart/70 shrink-0 overflow-hidden">
      {user?.discordAvatar && !err ? (
        <img
          src={user.discordAvatar}
          alt={user.discordUsername}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-heart/20 flex items-center justify-center text-heart font-bold" style={{ fontSize: 10 }}>
          {(user?.discordUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Compact avatar for the stacked preview row
function PreviewAvatar({ user }: { user?: AppUser }) {
  return (
    <div className="w-5 h-5 rounded-full ring-1 ring-heart/70 shrink-0 overflow-hidden">
      {user?.discordAvatar ? (
        <img src={user.discordAvatar} alt={user.discordUsername} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-heart/25 flex items-center justify-center text-heart font-bold" style={{ fontSize: 8 }}>
          {(user?.discordUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function WishersTooltip({ wisherIds, userMap }: { wisherIds: string[]; userMap?: Map<string, AppUser> }) {
  const [show, setShow] = useState(false);
  const preview = wisherIds.slice(0, 3);

  return (
    <div
      className="absolute top-1.5 left-1.5 z-10"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {/* Stacked preview */}
      <div className="relative flex items-center cursor-default">
        <div className="flex -space-x-1.5">
          {preview.map(id => <PreviewAvatar key={id} user={userMap?.get(id)} />)}
        </div>
        {wisherIds.length > 3 && (
          <span className="ml-1 text-[9px] text-heart font-bold">+{wisherIds.length - 3}</span>
        )}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-heart rounded-full flex items-center justify-center">
          <svg className="w-2 h-2 text-night" viewBox="0 0 20 20" fill="currentColor">
            <path d={HEART_PATH} />
          </svg>
        </div>
      </div>

      {show && (
        <div className="absolute top-full left-0 mt-1.5 bg-panel border border-line rounded-lg shadow-xl shadow-black/40 p-2.5 z-50 pointer-events-none min-w-[120px] animate-fade-in">
          <p className="text-[9px] text-heart mb-2 font-bold uppercase tracking-wider flex items-center gap-1">
            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d={HEART_PATH} />
            </svg>
            Wished by
          </p>
          <div className="flex flex-wrap gap-2">
            {wisherIds.map(id => {
              const u = userMap?.get(id);
              return (
                <div key={id} className="flex flex-col items-center gap-0.5">
                  <UserAvatar user={u} variant="md" />
                  <span className="text-[8px] text-muted truncate max-w-[36px]">
                    {u?.discordUsername?.split('#')[0] || id.slice(0, 6)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CharacterCard({ character, userMap, wishers, compact, dragging, displayOrder, hideWish, index }: Props) {
  const { isWished, toggleWish } = useStore();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wishing, setWishing] = useState(false);
  const [popping, setPopping] = useState(false);

  const rarity = getRarity(character.kakeraValue);
  const { edge, badge } = RARITY[rarity];
  const wished = isWished(character.characterId);
  const owner = character.userId ? userMap?.get(character.userId) : undefined;
  const initials = character.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const handleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishing) return;
    setWishing(true);
    setPopping(true);
    await toggleWish(character.characterId);
    setWishing(false);
  };

  const stagger = index !== undefined
    ? { animationDelay: `${Math.min(index * 35, 500)}ms` }
    : undefined;

  const image = (
    <div className="relative aspect-[2/3] overflow-hidden bg-panel2">
      {character.imageUrl && !imgError ? (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted/40 text-xl font-display font-bold">{initials}</span>
            </div>
          )}
          <img
            src={character.imageUrl}
            alt={character.name}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.05] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-2xl font-display font-bold text-muted/50">{initials}</span>
          <span className="text-[9px] text-muted/70 text-center leading-tight">{character.name}</span>
        </div>
      )}

      {compact && (
        <div className="absolute inset-x-0 bottom-0 bg-night/90 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-ink text-[9px] font-semibold truncate">{character.name}</p>
        </div>
      )}

      {displayOrder !== undefined && (
        <div className="absolute top-1 left-1 bg-night/85 text-kakera font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
          {displayOrder + 1}
        </div>
      )}

      {!hideWish && (
        <button
          onClick={handleWish}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`
            absolute bottom-1.5 right-1.5 pointer-events-auto
            w-6 h-6 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${wished ? 'bg-heart text-night opacity-100' : 'bg-night/70 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-heart'}
          `}
        >
          <svg
            className={`w-3 h-3 ${popping ? 'animate-pop' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            onAnimationEnd={() => setPopping(false)}
          >
            <path d={HEART_PATH} />
          </svg>
        </button>
      )}
    </div>
  );

  const cardContent = (
    <div
      style={stagger}
      className={`
        group relative rounded-xl border bg-panel overflow-visible
        transition-all duration-200
        ${edge}
        ${index !== undefined ? 'animate-rise' : ''}
        ${dragging
          ? 'opacity-50 scale-95'
          : 'hover:-translate-y-1 hover:border-kakera/60 hover:shadow-lg hover:shadow-black/50'}
      `}
    >
      <div className="rounded-xl overflow-hidden">
        {image}

        {/* Embed-style footer — solid, no scrim */}
        {!compact && (
          <div className="px-2 py-1.5">
            <p className="text-ink font-semibold text-xs leading-tight truncate">{character.name}</p>
            <p className="text-muted text-[10px] truncate mt-0.5 min-h-[13px]">{character.series || ' '}</p>
            <div className="flex items-center justify-between mt-1 min-h-[20px]">
              {character.kakeraValue ? (
                <span className={badge}>
                  <img src="/Kakera.webp" alt="kakera" className="w-2.5 h-2.5 object-contain" />
                  {character.kakeraValue}
                </span>
              ) : <span />}
              {owner && <UserAvatar user={owner} />}
            </div>
          </div>
        )}
      </div>

      {!hideWish && wishers && wishers.length > 0 && (
        <WishersTooltip wisherIds={wishers} userMap={userMap} />
      )}
    </div>
  );

  if (compact) return cardContent;
  return <Link to={`/character/${character.characterId}`} className="block">{cardContent}</Link>;
}
