import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../auth';
import { fetchUserCharactersAll, updateCharacterOrder } from '../db';
import { CharacterCard } from '../components/CharacterCard';
import { GridSkeleton } from '../components/SkeletonLoader';
import { ToastList } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import type { Character } from '../types';

const SortableCard = memo(function SortableCard({
  character, selected, onSelect,
}: { character: Character; selected: boolean; onSelect: (id: string, e?: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: character.characterId });
  const style = useMemo(() => ({ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }), [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${selected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#15162a] rounded-xl' : ''}`}
      {...attributes}
      {...listeners}
      onClick={e => { e.stopPropagation(); onSelect(character.characterId, e); }}
    >
      <CharacterCard character={character} compact hideWish />
    </div>
  );
});

export default function CharacterOrderPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, remove } = useToast();

  const [chars, setChars] = useState<Character[]>([]);
  const [initialOrder, setInitialOrder] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [lastIdx, setLastIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const charIds = useMemo(() => chars.map(c => c.characterId), [chars]);

  useEffect(() => {
    if (!profile?.discordId) return;
    fetchUserCharactersAll(profile.discordId).then(list => {
      setChars(list);
      setInitialOrder(new Map(list.map((c, i) => [c.characterId, c.displayOrder ?? i])));
    }).finally(() => setLoading(false));
  }, [profile?.discordId]);

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragging(true);
    setActiveDragId(active.id.toString());
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const dragId = active.id.toString();
    if (selected.has(dragId) && selected.size > 1) {
      const selectedChars = selectionOrder.map(id => chars.find(c => c.characterId === id)!).filter(Boolean);
      const unselected = chars.filter(c => !selected.has(c.characterId));
      const overIdx = chars.findIndex(c => c.characterId === over.id.toString());
      const next = [...unselected];
      next.splice(overIdx, 0, ...selectedChars);
      setChars(next);
    } else {
      const oldIdx = chars.findIndex(c => c.characterId === active.id.toString());
      const newIdx = chars.findIndex(c => c.characterId === over.id.toString());
      setChars(arrayMove(chars, oldIdx, newIdx));
    }
    setHasChanges(true);
  };

  const onSelect = useCallback((id: string, e?: React.MouseEvent) => {
    if (dragging) return;
    const idx = chars.findIndex(c => c.characterId === id);

    if (e?.ctrlKey || e?.metaKey) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); setSelectionOrder(o => o.filter(x => x !== id)); }
        else { next.add(id); setSelectionOrder(o => [...o, id]); }
        return next;
      });
      setLastIdx(idx);
    } else if (e?.shiftKey && lastIdx !== null) {
      const [a, b] = [Math.min(lastIdx, idx), Math.max(lastIdx, idx)];
      setSelected(prev => {
        const next = new Set(prev);
        const newOrder = [...selectionOrder];
        for (let i = a; i <= b; i++) {
          const cid = chars[i].characterId;
          if (!next.has(cid)) { next.add(cid); newOrder.push(cid); }
        }
        setSelectionOrder(newOrder);
        return next;
      });
    } else {
      if (selected.has(id) && selected.size === 1) {
        setSelected(new Set()); setSelectionOrder([]); setLastIdx(null);
      } else {
        setSelected(new Set([id])); setSelectionOrder([id]); setLastIdx(idx);
      }
    }
  }, [dragging, chars, lastIdx, selected, selectionOrder]);

  const saveOrder = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const changed = chars.filter((c, i) => initialOrder.get(c.characterId) !== i);
      if (!changed.length) { setHasChanges(false); return; }

      await updateCharacterOrder(changed.map((c) => ({ characterId: c.characterId, newOrder: chars.indexOf(c) })));
      setInitialOrder(new Map(chars.map((c, i) => [c.characterId, i])));
      setHasChanges(false);
      toast(`Saved! (${changed.length} characters updated)`, 'success');
    } catch {
      toast('Failed to save order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copySmCmd = async () => {
    if (!chars.length) return;
    await navigator.clipboard.writeText('$sm ' + chars.map(c => c.name).join('$'));
    toast(`$sm copied for ${chars.length} characters!`, 'success');
  };

  const activeChar = activeDragId ? chars.find(c => c.characterId === activeDragId) : null;
  const draggedChars = activeDragId && selected.has(activeDragId) && selected.size > 1
    ? selectionOrder.map(id => chars.find(c => c.characterId === id)!).filter(Boolean)
    : activeChar ? [activeChar] : [];

  if (loading) return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <GridSkeleton count={48} />
    </div>
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Reorder My Characters</h1>
            <p className="text-sm text-gray-400 mt-1">{chars.length} characters · Drag to reorder · Ctrl+click multi-select</p>
          </div>
          <button onClick={() => navigate('/collection')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors border border-gray-700 shrink-0">
            ← Back
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={copySmCmd}
            disabled={!chars.length}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-full text-sm text-gray-300 transition-colors border border-gray-700 font-mono"
          >
            Copy $sm
          </button>
          <button
            onClick={saveOrder}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:bg-gray-700 rounded-full text-sm text-white font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-950/50 border border-yellow-700/50 rounded-xl text-yellow-300 text-sm">
            <span>⚠</span> Unsaved changes
          </div>
        )}
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={charIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-1.5">
            {chars.map(char => (
              <SortableCard
                key={char.characterId}
                character={char}
                selected={selected.has(char.characterId)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {draggedChars.length === 1 ? (
            <div className="opacity-90 w-20">
              <CharacterCard character={draggedChars[0]} compact hideWish dragging />
            </div>
          ) : draggedChars.length > 1 ? (
            <div className="relative w-20 h-28">
              {draggedChars.slice(0, 3).map((c, i) => (
                <div key={c.characterId} className="absolute w-full" style={{ top: i * 6, left: i * 6, zIndex: 3 - i }}>
                  <CharacterCard character={c} compact hideWish dragging />
                </div>
              ))}
              <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10">
                {draggedChars.length}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {chars.length === 0 && (
        <div className="text-center py-24 text-gray-500">No characters in your collection yet.</div>
      )}

      <ToastList toasts={toasts} onRemove={remove} />
    </div>
  );
}
