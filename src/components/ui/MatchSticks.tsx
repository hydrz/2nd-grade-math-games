export function MatchSticks({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 100" aria-hidden="true">
      <g stroke="#e7bc7e" strokeWidth="7" strokeLinecap="round">
        {[
          [36, 22, 78, 22],
          [83, 28, 83, 47],
          [36, 52, 78, 52],
          [83, 58, 83, 78],
          [36, 84, 78, 84],
          [106, 52, 134, 52],
          [120, 38, 120, 66],
          [153, 24, 185, 24],
          [190, 30, 190, 77],
          [153, 83, 185, 83],
        ].map((p, i) => (
          <line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} />
        ))}
      </g>
      <g fill="#e76c52">
        {[
          [78, 22],
          [83, 47],
          [78, 52],
          [83, 78],
          [78, 84],
          [134, 52],
          [120, 66],
          [185, 24],
          [190, 77],
          [185, 83],
        ].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4.5" />
        ))}
      </g>
    </svg>
  );
}
