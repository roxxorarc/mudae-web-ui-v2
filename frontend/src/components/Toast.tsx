import type { Toast } from '../hooks/useToast';

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS = {
  success: 'border-emerald-500 bg-emerald-950/90 text-emerald-200',
  error:   'border-red-500 bg-red-950/90 text-red-200',
  info:    'border-blue-500 bg-blue-950/90 text-blue-200',
};

export function ToastList({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl cursor-pointer animate-fade-in max-w-sm ${COLORS[t.type]}`}
        >
          <span className="font-bold text-lg leading-none">{ICONS[t.type]}</span>
          <span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
