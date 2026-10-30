import { useRef, useState } from 'react';
import { MousePointer2, MoveRight } from 'lucide-react';
import { changeCounts, operationLabel } from '../../match/matches';
import { playSound } from '../../core/sound';
import type { MatchPuzzle } from '../../core/types';

const segments = [
  [12, 10, 62, 10],
  [67, 17, 67, 57],
  [67, 73, 67, 113],
  [12, 120, 62, 120],
  [7, 73, 7, 113],
  [7, 17, 7, 57],
  [12, 65, 62, 65],
];
const offsets = [15, 98, 188, 271, 354, 505, 588];
export function MatchCanvas({
  puzzle,
  state,
  onChange,
  disabled = false,
  hint = false,
  reveal = false,
}: {
  puzzle: MatchPuzzle;
  state: number[];
  onChange: (s: number[]) => void;
  disabled?: boolean;
  hint?: boolean;
  reveal?: boolean;
}) {
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const dragging = useRef<{
      from: [number, number];
      x: number;
      y: number;
    } | null>(null),
    suppressClick = useRef(false);
  const { removed, added } = changeCounts(puzzle.initial, state);
  const solution = puzzle.solutions[0],
    changed = state.flatMap((mask, i) =>
      Array.from({ length: i === 2 ? 2 : 7 }, (_, bit) => ({ i, bit })).filter(
        (v) => !!(mask & (1 << v.bit)) !== !!(solution[i] & (1 << v.bit)),
      ),
    );
  function click(i: number, bit: number) {
    if (disabled) return;
    const present = !!(state[i] & (1 << bit)),
      next = [...state];
    if (puzzle.operation === 'remove' && present) {
      next[i] &= ~(1 << bit);
      onChange(next);
      playSound('match');
    }
    if (puzzle.operation === 'add' && !present) {
      next[i] |= 1 << bit;
      onChange(next);
      playSound('match');
    }
    if (puzzle.operation === 'move') {
      if (present) {
        playSound('pick');
        setSelected((prev) =>
          prev?.[0] === i && prev[1] === bit ? null : [i, bit],
        );
      } else if (selected) {
        next[selected[0]] &= ~(1 << selected[1]);
        next[i] |= 1 << bit;
        onChange(next);
        playSound('match');
        setSelected(null);
      }
    }
  }
  return (
    <div className="match-board" data-operation={puzzle.operation}>
      <div className="match-rule">
        <strong>
          {operationLabel[puzzle.operation]}
          <span>{puzzle.count}</span>根火柴，让等式成立
        </strong>
        <span className="operation-counter">
          拿走 {removed} 根 · 添加 {added} 根
        </span>
      </div>
      <svg
        viewBox="0 0 680 166"
        className="matches-svg"
        role="img"
        aria-label={`${operationLabel[puzzle.operation]}${puzzle.count}根火柴算式画布`}
        onPointerMove={(e) => {
          const d = dragging.current;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 6) {
            e.currentTarget.setPointerCapture(e.pointerId);
            setSelected(d.from);
          }
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
        onPointerUp={(e) => {
          const drag = dragging.current;
          dragging.current = null;
          if (!drag || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6)
            return;
          suppressClick.current = true;
          setTimeout(() => {
            suppressClick.current = false;
          }, 0);
          const element = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest('[data-slot]');
          if (element) {
            const i = Number(element.getAttribute('data-cell')),
              bit = Number(element.getAttribute('data-bit'));
            if (!(state[i] & (1 << bit))) {
              const next = [...state];
              next[drag.from[0]] &= ~(1 << drag.from[1]);
              next[i] |= 1 << bit;
              onChange(next);
              playSound('match');
              setSelected(null);
            }
          }
        }}
      >
        {offsets.map((x, i) => (
          <g key={i} transform={`translate(${x} 18)`}>
            {(i === 2
              ? [
                  [1, 65, 69, 65],
                  [35, 31, 35, 99],
                ]
              : segments
            ).map(([x1, y1, x2, y2], bit) => {
              const present = !!(state[i] & (1 << bit)),
                vacated = !present && !!(puzzle.initial[i] & (1 << bit)),
                chosen = selected?.[0] === i && selected[1] === bit,
                mark = reveal
                  ? changed.some((v) => v.i === i && v.bit === bit)
                  : hint && changed[0]?.i === i && changed[0].bit === bit;
              return (
                <g
                  key={bit}
                  data-slot="true"
                  data-cell={i}
                  data-bit={bit}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`${i + 1}号位置${bit + 1}段，${present ? '有火柴' : '空槽'}`}
                  aria-pressed={chosen}
                  className={`match-slot ${present ? 'present' : 'empty'} ${vacated ? 'vacated' : ''} ${chosen ? 'chosen' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      click(i, bit);
                    }
                  }}
                  onClick={() => {
                    if (!suppressClick.current) click(i, bit);
                  }}
                  onPointerDown={(e) => {
                    if (puzzle.operation !== 'move' || !present || disabled)
                      return;
                    dragging.current = {
                      from: [i, bit],
                      x: e.clientX,
                      y: e.clientY,
                    };
                  }}
                >
                  <rect
                    x={Math.min(x1, x2) - 10}
                    y={Math.min(y1, y2) - 10}
                    width={Math.abs(x2 - x1) + 20}
                    height={Math.abs(y2 - y1) + 20}
                    fill="transparent"
                  />
                  <line
                    className="match-wood"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={present ? '#e7bc7e' : '#c5d8c7'}
                    strokeWidth={chosen ? 7 : 5.5}
                    strokeLinecap="round"
                    strokeDasharray={present ? undefined : '3 5'}
                  />
                  {present && (
                    <line
                      x1={x2 - (x2 - x1) * 0.12}
                      y1={y2 - (y2 - y1) * 0.12}
                      x2={x2}
                      y2={y2}
                      stroke="#e76c52"
                      strokeWidth="7"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  )}
                  {mark && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#fff0a2"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeOpacity=".6"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}
        {[62, 84].map((y) => (
          <line
            key={y}
            x1="454"
            y1={y + 18}
            x2="487"
            y2={y + 18}
            stroke="#e9d6ad"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <p className="match-instructions">
        <MousePointer2 size={17} />
        {puzzle.operation === 'remove'
          ? '点一下要拿走的火柴。'
          : puzzle.operation === 'add'
            ? '点一下虚线空槽，放入一根火柴。'
            : '拖动火柴，或先点火柴，再点虚线空槽。'}
        <MoveRight size={17} />
        等号保持不变
      </p>
      {hint && (
        <p className="match-hint">
          提示：看看浅黄色标记附近，那里可能藏着突破口。
        </p>
      )}
    </div>
  );
}
