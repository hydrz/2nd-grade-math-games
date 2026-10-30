import {
  bounds,
  pathOf,
  piece,
  placedRing,
  polygon,
  silhouette,
} from '../../tangram/geometry';
import type { TangramPuzzle } from '../../core/types';

export function MiniTangram({
  puzzle,
  colored = false,
  className = '',
}: {
  puzzle: TangramPuzzle;
  colored?: boolean;
  className?: string;
}) {
  const target = silhouette(puzzle.placements),
    b = bounds(target),
    pad = 0.2;
  return (
    <svg
      className={className}
      viewBox={`${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`}
      aria-label={puzzle.name}
      role="img"
    >
      {colored ? (
        puzzle.placements.map((p) => (
          <path
            key={p.id}
            d={pathOf([polygon(placedRing(p))])}
            fill={piece(p.id).color}
            stroke="#fffaf2"
            strokeWidth=".025"
            strokeLinejoin="round"
          />
        ))
      ) : (
        <path d={pathOf(target)} fill="currentColor" fillRule="evenodd" />
      )}
    </svg>
  );
}
