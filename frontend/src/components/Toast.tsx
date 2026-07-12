import type { Toast } from '../hooks/useToast';

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS = {
  success: 'border-l-emerald-400 text-emerald-300',
  error:   'border-l-red-400 text-red-300',
  info:    'border-l-kakera text-kakera',
};

export function ToastList({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg bg-panel border border-line border-l-2 shadow-2xl shadow-black/50 cursor-pointer animate-rise max-w-sm ${COLORS[t.type]}`}
        >
          <span className="font-bold text-lg leading-none">{ICONS[t.type]}</span>
          <span className="text-sm font-semibold text-ink">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
