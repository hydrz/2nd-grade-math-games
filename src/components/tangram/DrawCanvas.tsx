import { useMemo, useRef, useState } from 'react'
import {
  CircleDashed,
  Eraser,
  FlipHorizontal2,
  Pencil,
  Redo2,
  RotateCcw,
  Undo2,
  ZoomIn,
  X,
} from 'lucide-react'
import type { MultiPolygon } from 'polygon-clipping'
import {
  bounds,
  containsPoint,
  distance,
  pathOf,
  piece,
  placedRing,
  polygon,
  project,
  rayIntersections,
  round,
  silhouette,
  snapPoint,
  strokePath,
  strokePoints,
  vertexPoints,
} from '../../tangram/geometry'
import { clone, localPoint } from './canvas-shared'
import { playSound } from '../../core/sound'
import type { Point, Stroke, TangramPuzzle } from '../../core/types'

export function DrawCanvas({
  puzzle,
  strokes,
  onChange,
  reveal,
  hint,
  compact = false,
  disabled = false,
  view,
  bad,
  badStroke,
}: {
  puzzle: TangramPuzzle
  strokes: Stroke[]
  onChange: (s: Stroke[]) => void
  reveal: boolean
  hint: boolean
  compact?: boolean
  disabled?: boolean
  view?: { width: number; height: number }
  bad?: MultiPolygon | null
  badStroke?: number
}) {
  const [tool, setTool] = useState<'line' | 'arc' | 'erase'>('line'),
    [side, setSide] = useState(1)
  const [preview, setPreview] = useState<Stroke | null>(null),
    [hover, setHover] = useState<{ p: Point; snapped: boolean } | null>(null),
    [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState<Point | null>(null)
  const [future, setFuture] = useState<Stroke[][]>([]),
    [history, setHistory] = useState<Stroke[][]>([])
  const target = useMemo(() => silhouette(puzzle.placements), [puzzle.placements]),
    b = bounds(target),
    pad = 0.5
  // One shared viewport per question keeps identical pieces the same size on every board.
  const width = view?.width ?? b.width + pad * 2,
    height = view?.height ?? b.height + pad * 2
  const viewBox = `${b.x + b.width / 2 - width / 2} ${b.y + b.height / 2 - height / 2} ${width} ${height}`
  const active = useRef(false)
  const anchors = useMemo(
    () => [...vertexPoints(target), ...strokes.flatMap((s) => [s.a, s.b])],
    [target, strokes],
  )
  const boundarySegments = useMemo(
    () =>
      target
        .flatMap((poly) => poly)
        .flatMap((ring) => ring.slice(1).map((point, i) => [ring[i], point] as [Point, Point])),
    [target],
  )
  function boundaryGap(p: Point) {
    let best = Infinity
    for (const [a, c] of boundarySegments) {
      const dx = c[0] - a[0],
        dy = c[1] - a[1],
        denominator = dx * dx + dy * dy
      const t = denominator
        ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator))
        : 0
      const gap = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
      if (gap < best) best = gap
    }
    return best
  }
  // Semicircles between the same endpoints differ only by bulge direction: pick the one that hugs the visible outline.
  function autoArcSide(a: Point, c: Point): number | null {
    if (distance(a, c) < 0.15) return null
    const probe = (s: number) => {
      const points = strokePoints({ kind: 'arc', a, b: c, side: s }),
        middle = points[Math.floor(points.length / 2)]
      return { middle, inside: containsPoint(middle, target), gap: boundaryGap(middle) }
    }
    const bulgeUp = probe(1),
      bulgeDown = probe(-1)
    if (bulgeUp.inside !== bulgeDown.inside) return bulgeUp.inside ? 1 : -1
    if (Math.abs(bulgeUp.gap - bulgeDown.gap) > 0.12) return bulgeUp.gap < bulgeDown.gap ? 1 : -1
    return null
  }
  // An endpoint is "connected" once it sits on the outline or another line.
  const endpoints = useMemo(
    () =>
      strokes.map((s, i) => {
        const others = strokes.filter((_, j) => j !== i)
        return [s.a, s.b].map((p) => distance(p, snapPoint(p, target, others, 0.05)) < 1e-6)
      }),
    [target, strokes],
  )
  function commit(next: Stroke[]) {
    setHistory((h) => [...h, clone(strokes)])
    setFuture([])
    onChange(next)
  }
  function resolve(
    e: React.PointerEvent<SVGSVGElement>,
    start?: Point,
  ): { p: Point; snapped: boolean } {
    const p = localPoint(e),
      rect = e.currentTarget.getBoundingClientRect(),
      scale = Math.min(rect.width / width, rect.height / height) || 1
    const anchorThreshold = 18 / scale,
      rulerThreshold = 12 / scale
    if (!start) {
      const first = snapPoint(p, target, strokes, anchorThreshold)
      // snapPoint returns the same point only when nothing was within reach.
      if (distance(first, p) > 0) return { p: first, snapped: true }
      // Auxiliary ruler distances derive only from visible boundary vertices.
      const candidate: Point[] = vertexPoints(target).flatMap((v) =>
        [0, 0.5, 1, Math.SQRT2, Math.SQRT2 - 1, 1 / Math.SQRT2].flatMap(
          (d) =>
            [
              [v[0] + d, v[1]],
              [v[0] - d, v[1]],
              [v[0], v[1] + d],
              [v[0], v[1] - d],
            ] as Point[],
        ),
      )
      let best = first,
        diff = rulerThreshold
      for (const q of candidate)
        if (distance(q, p) < diff) {
          diff = distance(q, p)
          best = q
        }
      if (distance(best, first) > 1e-9) return { p: best, snapped: true }
      return { p, snapped: false }
    }
    // Direction is locked first, then the endpoint glides along that one line.
    const angle = Math.atan2(p[1] - start[1], p[0] - start[0]),
      locked = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4),
      length = distance(p, start)
    const dx = Math.cos(locked),
      dy = Math.sin(locked),
      magnet = 26 / scale,
      corridor = 8 / scale
    let best: Point | null = null,
      bestGap = magnet
    const anchorCandidates = [...vertexPoints(target), ...strokes.flatMap((s) => [s.a, s.b])]
    for (const q of anchorCandidates) {
      const rx = q[0] - start[0],
        ry = q[1] - start[1],
        along = rx * dx + ry * dy,
        off = Math.abs(rx * dy - ry * dx)
      if (along < 0.05 || off > corridor) continue
      const gap = Math.hypot(along - length, off)
      if (gap < bestGap) {
        bestGap = gap
        best = q
      }
    }
    for (const h of rayIntersections(start, locked, target, strokes)) {
      const gap = Math.abs(distance(h, start) - length)
      if (gap < bestGap) {
        bestGap = gap
        best = h
      }
    }
    if (best) return { p: best, snapped: true }
    // The pen cannot leave the figure: the first outline crossing ends the stroke.
    let stop: Point | null = null,
      stopAlong = Infinity
    for (const h of rayIntersections(start, locked, target, [])) {
      const along = distance(h, start)
      if (along > 0.05 && along <= length + magnet && along < stopAlong) {
        stopAlong = along
        stop = h
      }
    }
    if (stop) return { p: stop, snapped: true }
    if (length > 0.02)
      return { p: [round(start[0] + dx * length), round(start[1] + dy * length)], snapped: false }
    return { p, snapped: false }
  }
  function down(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = resolve(e).p
    if (tool === 'erase') {
      const index = strokes.findIndex((s) =>
        strokePoints(s).some((v, i, arr) => i && distance(p, project(p, arr[i - 1], v)) < 0.18),
      )
      if (index >= 0) {
        commit(strokes.filter((_, i) => i !== index))
        playSound('erase')
      }
      setPending(null)
      return
    }
    active.current = true
    setPreview({ kind: tool, a: p, b: p, side })
    playSound('pen')
  }
  function connect(p: Point) {
    if (!pending) {
      setPending(p)
      return
    }
    if (distance(pending, p) < 0.08) return
    const stroke: Stroke =
      tool === 'arc'
        ? { kind: 'arc', a: pending, b: p, side: autoArcSide(pending, p) ?? side }
        : { kind: 'line', a: pending, b: p }
    commit([...strokes, stroke])
    playSound('draw')
    setPending(null)
  }
  function up(e: React.PointerEvent<SVGSVGElement>) {
    if (!active.current || !preview) return
    active.current = false
    // A tap is decided by raw pointer travel, before any snapping or direction locking.
    const raw = localPoint(e),
      rect = e.currentTarget.getBoundingClientRect()
    const scale = Math.min(rect.width / width, rect.height / height) || 1
    if (distance(preview.a, raw) * scale < 9) {
      setPreview(null)
      connect(preview.a)
      return
    }
    const next = { ...preview, b: resolve(e, preview.kind === 'line' ? preview.a : undefined).p }
    if (next.kind === 'arc') next.side = autoArcSide(next.a, next.b) ?? next.side
    if (distance(next.a, next.b) > 0.08) {
      commit([...strokes, next])
      playSound('draw')
      setPending(null)
    }
    setPreview(null)
  }
  const content = (
    <>
      <div className="draw-tools" role="toolbar" aria-label={`${puzzle.name}画线工具`}>
        <button
          className={tool === 'line' ? 'tool active' : 'tool'}
          aria-label="直线"
          title="直线"
          onClick={() => {
            setTool('line')
            setPending(null)
          }}
          disabled={disabled}
        >
          <Pencil size={17} />
        </button>
        <button
          className={tool === 'arc' ? 'tool active' : 'tool'}
          aria-label="半圆弧"
          title="半圆弧：拖出直径"
          onClick={() => {
            setTool('arc')
            setPending(null)
          }}
          disabled={disabled}
        >
          <CircleDashed size={18} />
        </button>
        {tool === 'arc' && (
          <button
            className="tool"
            title="换弧向"
            aria-label="换弧向"
            onClick={() => setSide(-side)}
          >
            <FlipHorizontal2 size={17} />
          </button>
        )}
        <button
          className={tool === 'erase' ? 'tool active' : 'tool'}
          aria-label="擦除"
          title="擦除"
          onClick={() => {
            setTool('erase')
            setPending(null)
          }}
          disabled={disabled}
        >
          <Eraser size={17} />
        </button>
        <span className="tool-separator" />
        <button
          className="tool"
          aria-label="撤销画线"
          disabled={!history.length || disabled}
          onClick={() => {
            const last = history[history.length - 1]
            setFuture((f) => [...f, strokes])
            setHistory((h) => h.slice(0, -1))
            onChange(last)
            playSound('erase')
          }}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="tool"
          aria-label="重做画线"
          disabled={!future.length || disabled}
          onClick={() => {
            const last = future[future.length - 1]
            setHistory((h) => [...h, strokes])
            setFuture((f) => f.slice(0, -1))
            onChange(last)
            playSound('draw')
          }}
        >
          <Redo2 size={17} />
        </button>
        <button
          className="tool"
          aria-label="清空本图"
          title="清空本图"
          disabled={!strokes.length || disabled}
          onClick={() => {
            playSound('erase')
            commit([])
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <svg
        className="drawing-svg"
        viewBox={viewBox}
        style={{ '--board-ratio': `${width} / ${height}` } as React.CSSProperties}
        onPointerDown={down}
        onPointerMove={(e) => {
          const moved = resolve(
            e,
            active.current && preview?.kind === 'line' ? preview.a : undefined,
          )
          setHover(moved)
          if (active.current) {
            const end = moved.p
            setPreview((prev) =>
              prev
                ? {
                    ...prev,
                    b: end,
                    side: prev.kind === 'arc' ? (autoArcSide(prev.a, end) ?? prev.side) : prev.side,
                  }
                : null,
            )
          }
        }}
        onPointerUp={up}
        onPointerCancel={() => {
          active.current = false
          setPreview(null)
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${puzzle.name}画线区`}
      >
        <path
          d={pathOf(target)}
          fill="#fff"
          fillRule="evenodd"
          stroke="#344c47"
          strokeWidth=".026"
          strokeLinejoin="round"
        />
        {(reveal
          ? puzzle.placements
          : hint
            ? puzzle.placements.filter((p) => p.id === 'large')
            : []
        ).map((p) => (
          <path
            key={p.id}
            d={pathOf([polygon(placedRing(p))])}
            fill={reveal ? piece(p.id).color : '#e4864333'}
            fillOpacity={reveal ? 0.72 : 1}
            stroke="#42645a"
            strokeWidth=".018"
          />
        ))}
        {bad && (
          <path
            d={pathOf(bad)}
            fill="#e4574b"
            fillOpacity=".24"
            stroke="#c0392b"
            strokeWidth=".022"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}
        {strokes.map((s, i) => (
          <path
            key={i}
            d={strokePath(s)}
            fill="none"
            stroke={i === badStroke ? '#c0392b' : '#117d70'}
            strokeWidth={i === badStroke ? '.04' : '.028'}
            strokeLinecap="round"
          />
        ))}
        {preview && (
          <path
            d={strokePath(preview)}
            fill="none"
            stroke="#e98c3d"
            strokeWidth=".032"
            strokeDasharray=".06 .04"
          />
        )}
        {pending && !disabled && (
          <>
            <circle
              cx={pending[0]}
              cy={pending[1]}
              r=".09"
              fill="#fff"
              stroke="#e98c3d"
              strokeWidth=".028"
              pointerEvents="none"
            />
            {hover &&
              (tool === 'line' ? (
                <line
                  x1={pending[0]}
                  y1={pending[1]}
                  x2={hover.p[0]}
                  y2={hover.p[1]}
                  stroke="#e98c3d"
                  strokeWidth=".024"
                  strokeDasharray=".06 .05"
                  pointerEvents="none"
                />
              ) : (
                <path
                  d={strokePath({
                    kind: 'arc',
                    a: pending,
                    b: hover.p,
                    side: autoArcSide(pending, hover.p) ?? side,
                  })}
                  fill="none"
                  stroke="#e98c3d"
                  strokeWidth=".024"
                  strokeDasharray=".06 .05"
                  pointerEvents="none"
                />
              ))}
          </>
        )}
        {(hover || preview) &&
          anchors.map((p, i) => (
            <circle
              key={`a${i}`}
              cx={p[0]}
              cy={p[1]}
              r=".07"
              fill="#2f5a4c"
              fillOpacity=".45"
              pointerEvents="none"
            />
          ))}
        {strokes.map((s, i) =>
          [s.a, s.b].map((p, n) => (
            <circle
              key={`e${i}-${n}`}
              cx={p[0]}
              cy={p[1]}
              r=".06"
              fill={endpoints[i][n] ? '#2e7d6a' : '#e98c3d'}
              stroke="#fff"
              strokeWidth=".014"
              pointerEvents="none"
            />
          )),
        )}
        {hover && !disabled && (
          <circle
            cx={hover.p[0]}
            cy={hover.p[1]}
            r={hover.snapped ? '.085' : '.045'}
            fill={hover.snapped ? 'none' : '#e98c3d'}
            stroke="#e98c3d"
            strokeWidth={hover.snapped ? '.028' : '0'}
            pointerEvents="none"
          />
        )}
      </svg>
    </>
  )
  return (
    <section className={`draw-board ${compact ? 'compact' : ''}`}>
      <div className="board-heading">
        <span>{puzzle.name}</span>
        <span className="board-actions">
          <button
            className="tool"
            onClick={() => setExpanded(true)}
            aria-label={`放大${puzzle.name}`}
          >
            <ZoomIn size={18} />
          </button>
        </span>
      </div>
      {expanded ? (
        <div
          className="canvas-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`放大${puzzle.name}`}
        >
          <div className="expanded-board">
            <div className="board-heading">
              <strong>{puzzle.name}</strong>
              <button className="tool" aria-label="关闭放大" onClick={() => setExpanded(false)}>
                <X />
              </button>
            </div>
            {content}
            <p className="canvas-note">点两个圆点即可连线；直线自动对齐 45° 角。</p>
          </div>
        </div>
      ) : (
        content
      )}
    </section>
  )
}
