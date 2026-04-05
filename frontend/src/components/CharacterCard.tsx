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
}

// Unified avatar — sm = card owner, md = tooltip wisher
function UserAvatar({ user, variant = 'sm' }: { user?: AppUser; variant?: 'sm' | 'md' }) {
  const [err, setErr] = useState(false);

  if (variant === 'sm') {
    // Small: card bottom-right owner
    return user?.discordAvatar && !err ? (
      <img
        src={user.discordAvatar}
        alt={user.discordUsername}
        className="w-5 h-5 rounded-full object-cover ring-1 ring-black/40"
        onError={() => setErr(true)}
      />
    ) : (
      <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold" style={{ fontSize: 9 }}>
        {(user?.discordUsername || '?')[0]?.toUpperCase()}
      </div>
    );
  }

  // md: tooltip wisher with red aura
  return (
    <div className="w-7 h-7 rounded-full ring-2 ring-red-400/70 shadow-md shadow-red-500/40 shrink-0 overflow-hidden">
      {user?.discordAvatar && !err ? (
        <img
          src={user.discordAvatar}
          alt={user.discordUsername}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-red-900/60 flex items-center justify-center text-red-200 font-bold" style={{ fontSize: 10 }}>
          {(user?.discordUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Compact avatar for the stacked preview row (no state needed — no error handling at this scale)
function PreviewAvatar({ user }: { user?: AppUser }) {
  return (
    <div className="w-5 h-5 rounded-full ring-1 ring-red-400/60 shadow-sm shadow-red-500/30 shrink-0 overflow-hidden">
      {user?.discordAvatar ? (
        <img src={user.discordAvatar} alt={user.discordUsername} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-red-900/70 flex items-center justify-center text-red-200 font-bold" style={{ fontSize: 8 }}>
          {(user?.discordUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

const HEART_PATH = 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z';

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
          <span className="ml-1 text-[9px] text-red-300/80 font-bold">+{wisherIds.length - 3}</span>
        )}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center shadow">
          <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d={HEART_PATH} />
          </svg>
        </div>
      </div>

      {show && (
        <div className="absolute top-full left-0 mt-1.5 bg-gray-900/95 border border-red-500/25 rounded-xl shadow-2xl shadow-red-500/10 p-2.5 z-50 pointer-events-none min-w-[120px]">
          <p className="text-[9px] text-red-300/70 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1">
            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d={HEART_PATH} />
            </svg>
            Wishlisted by
          </p>
          <div className="flex flex-wrap gap-2">
            {wisherIds.map(id => {
              const u = userMap?.get(id);
              return (
                <div key={id} className="flex flex-col items-center gap-0.5">
                  <UserAvatar user={u} variant="md" />
                  <span className="text-[8px] text-gray-400 truncate max-w-[36px]">
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

export function CharacterCard({ character, userMap, wishers, compact, dragging, displayOrder, hideWish }: Props) {
  const { isWished, toggleWish } = useStore();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wishing, setWishing] = useState(false);

  const rarity = getRarity(character.kakeraValue);
  const { border, shadow } = RARITY[rarity];
  const wished = isWished(character.characterId);
  const owner = character.userId ? userMap?.get(character.userId) : undefined;
  const initials = character.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const handleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishing) return;
    setWishing(true);
    await toggleWish(character.characterId);
    setWishing(false);
  };

  const cardContent = (
    <div className={`
      group relative overflow-visible rounded-xl border-2 aspect-[2/3]
      bg-gray-900 transition-all duration-300
      ${border}
      ${shadow && !dragging ? `shadow-lg ${shadow}` : ''}
      ${dragging ? 'opacity-50 scale-95' : 'hover:scale-[1.03] hover:shadow-xl'}
    `}>
      <div className="absolute inset-0 rounded-[10px] overflow-hidden">
        {character.imageUrl && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="text-gray-600 text-xl font-bold">{initials}</span>
              </div>
            )}
            <img
              src={character.imageUrl}
              alt={character.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 gap-1 p-2">
            <span className="text-2xl font-black text-gray-500">{initials}</span>
            <span className="text-[9px] text-gray-600 text-center leading-tight">{character.name}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

        {!compact && (
          <div className="absolute inset-x-0 bottom-0 p-2 pointer-events-none">
            <p className="text-white font-semibold text-xs leading-tight truncate drop-shadow">{character.name}</p>
            {character.series && (
              <p className="text-gray-400 text-[10px] truncate mt-0.5">{character.series}</p>
            )}
            <div className="flex items-center justify-between mt-1">
              {character.kakeraValue ? (
                <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${RARITY[rarity].badge}`}>
                  <img src="/Kakera.webp" alt="kakera" className="w-2.5 h-2.5 object-contain" />
                  {character.kakeraValue}
                </span>
              ) : <span />}
              {owner && <div className="pointer-events-auto"><UserAvatar user={owner} /></div>}
            </div>
          </div>
        )}

        {compact && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="text-white text-[9px] font-medium truncate">{character.name}</p>
          </div>
        )}

        {displayOrder !== undefined && (
          <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            #{displayOrder + 1}
          </div>
        )}

        {!hideWish && (
          <button
            onClick={handleWish}
            className={`
              absolute bottom-1 right-1 pointer-events-auto
              w-6 h-6 rounded-full flex items-center justify-center
              transition-all duration-200
              ${wished ? 'bg-pink-600 text-white opacity-100' : 'bg-black/60 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-pink-400'}
              ${wishing ? 'scale-90' : ''}
            `}
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d={HEART_PATH} />
            </svg>
          </button>
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
