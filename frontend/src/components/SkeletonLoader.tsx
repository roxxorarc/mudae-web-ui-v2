export function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-800 border border-gray-700 aspect-[2/3] animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/50 to-gray-900/50" />
    </div>
  );
}

import { SIZE_GRIDS } from '../store';

export function GridSkeleton({ count = 24, gridClass }: { count?: number; gridClass?: string }) {
  const cls = gridClass ?? SIZE_GRIDS['md'];
  return (
    <div className={`grid ${cls} gap-2`}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
