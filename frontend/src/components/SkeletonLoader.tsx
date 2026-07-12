import { SIZE_GRIDS } from '../store';

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-panel border border-line overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-panel2" />
      <div className="px-2 py-1.5 space-y-1.5">
        <div className="h-2.5 bg-panel2 rounded w-3/4" />
        <div className="h-2 bg-panel2 rounded w-1/2" />
        <div className="h-4 bg-panel2 rounded w-10 mt-1" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 24, gridClass }: { count?: number; gridClass?: string }) {
  const cls = gridClass ?? SIZE_GRIDS['md'];
  return (
    <div className={`grid ${cls} gap-2.5`}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
