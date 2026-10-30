import { Star } from 'lucide-react';

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value}颗星`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i < value ? 'currentColor' : 'none'}
          className={i < value ? 'lit' : ''}
        />
      ))}
    </span>
  );
}
