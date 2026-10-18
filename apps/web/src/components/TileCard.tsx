import { ChevronRight, Lock } from 'lucide-react';
import type { HomeTile } from '../config/homeTiles';

interface TileCardProps {
  tile: HomeTile;
  locked: boolean;
  comingSoon: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function TileCard({ tile, locked, comingSoon, onClick, compact }: TileCardProps) {
  const Icon = tile.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col rounded-2xl p-5 text-left shadow-sm transition-transform active:scale-[0.98] ${
        compact ? 'min-h-[140px]' : 'min-h-[180px]'
      } ${tile.tileClass}`}
    >
      {locked ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs font-semibold">
          <Lock className="h-3 w-3" />
          Locked
        </span>
      ) : null}
      {comingSoon && !locked ? (
        <span className="absolute right-4 top-4 rounded-full bg-black/15 px-2 py-1 text-xs font-semibold">
          Soon
        </span>
      ) : null}

      <Icon className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} opacity-90`} strokeWidth={1.75} />

      <h3 className={`mt-4 font-bold leading-tight ${compact ? 'text-lg' : 'text-xl'}`}>
        {tile.title}
      </h3>
      <p className={`mt-1 flex-1 opacity-90 ${compact ? 'text-sm' : 'text-base'}`}>
        {tile.description}
      </p>

      <span
        className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold ${tile.buttonClass}`}
      >
        {locked ? 'Not available' : comingSoon ? 'Coming soon' : 'Open'}
        {!locked && !comingSoon ? <ChevronRight className="h-5 w-5" /> : null}
      </span>
    </button>
  );
}
