import { useRef, useState } from 'react'
import { FlipHorizontal2, Magnet, Move, Redo2, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import type { MultiPolygon } from 'polygon-clipping'
import {
  PIECES,
  bounds,
  pathOf,
  piece,
  placedRing,
  polygon,
  silhouette,
  snapPlacement,
} from '../../tangram/geometry'
import { clone, localPoint } from './canvas-shared'
import { sorted } from '../../core/collections'
import { playSound } from '../../core/sound'
import type { Placement, Point, TangramPuzzle } from '../../core/types'

export function AssemblyCanvas({
  puzzle,
  placements,
  onChange,
  reveal,
  hint,
  disabled = false,
  bad = null,
  action = null,
}: {
  puzzle: TangramPuzzle
  placements: Placement[]
  onChange: (p: Placement[]) => void
  reveal: boolean
  hint: boolean
  disabled?: boolean
  bad?: MultiPolygon | null
  action?: React.ReactNode
}) {
  const [selected, setSelected] = useState<Placement['id']>('large'),
    [live, setLive] = useState<Placement[] | null>(null),
    [snapPreview, setSnapPreview] = useState<Placement | null>(null),
    [history, setHistory] = useState<Placement[][]>([]),
    [future, setFuture] = useState<Placement[][]>([]),
    [draggingId, setDraggingId] = useState<Placement['id'] | null>(null)
  const drag = useRef<{ id: Placement['id']; start: Point; original: Placement } | null>(null)
  const target = silhouette(puzzle.placements),
    b = bounds(target),
    current = live || placements,
    viewWidth = b.width + 5.8,
    viewHeight = b.height + 4.9
  // The SVG letterboxes its viewBox, so the limiting side may be the height.
  function screenScale(svg: SVGSVGElement) {
    const r = svg.getBoundingClientRect()
    return Math.min(r.width / viewWidth, r.height / viewHeight) || 1
  }
  function draggedTo(q: Point) {
    const { original, start } = drag.current!
    return { ...original, x: original.x + q[0] - start[0], y: original.y + q[1] - start[1] }
  }
  function snapFor(p: Placement, all: Placement[], scale: number) {
    return snapPlacement(
      p,
      all.filter((v) => v.id !== p.id),
      target,
      puzzle.placements,
      20 / scale,
      34 / scale,
    )
  }
  function commit(next: Placement[]) {
    setHistory((h) => [...h, clone(placements)])
    setFuture([])
    onChange(next)
  }
  function changeSelected(angle: number, flip = false) {
    playSound('rotate')
    const p = placements.find((v) => v.id === selected)!,
      ring = placedRing(p),
      center: Point = [
        ring.reduce((s, q) => s + q[0], 0) / ring.length,
        ring.reduce((s, q) => s + q[1], 0) / ring.length,
      ]
    const a = (angle * Math.PI) / 180,
      dx = p.x - center[0],
      dy = p.y - center[1]
    let next = {
      ...p,
      x: center[0] + dx * Math.cos(a) - dy * Math.sin(a),
      y: center[1] + dx * Math.sin(a) + dy * Math.cos(a),
      angle: p.angle + angle,
    }
    if (flip) {
      const flipped = { ...p, flipped: !p.flipped },
        points = placedRing(flipped),
        c: Point = [
          points.reduce((s, q) => s + q[0], 0) / points.length,
          points.reduce((s, q) => s + q[1], 0) / points.length,
        ]
      next = { ...flipped, x: flipped.x + center[0] - c[0], y: flipped.y + center[1] - c[1] }
    }
    commit(placements.map((v) => (v.id === selected ? next : v)))
  }
  return (
    <div className="assembly-board">
      <div className="assembly-toolbar">
        <span>
          <Move size={16} />
          拖动拼板，点击选中
        </span>
        <div className="toolbar-actions">
          <button
            className="secondary"
            onClick={() => changeSelected(-45)}
            disabled={disabled}
            aria-label="逆时针旋转45度"
          >
            <RotateCcw size={17} />
            45°
          </button>
          <button
            className="secondary"
            onClick={() => changeSelected(45)}
            disabled={disabled}
            aria-label="顺时针旋转45度"
          >
            <RotateCw size={17} />
            45°
          </button>
          <button className="secondary" onClick={() => changeSelected(0, true)} disabled={disabled}>
            <FlipHorizontal2 size={17} />
            翻面
          </button>
          <span className="angle-readout" aria-label="选中拼板角度">
            {Math.round(current.find((p) => p.id === selected)!.angle % 360)}°
          </span>
          <button
            className="tool"
            aria-label="撤销组装"
            disabled={!history.length || disabled}
            onClick={() => {
              setFuture((f) => [...f, placements])
              onChange(history[history.length - 1])
              setHistory((h) => h.slice(0, -1))
              playSound('tap')
            }}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="tool"
            aria-label="重做组装"
            disabled={!future.length || disabled}
            onClick={() => {
              setHistory((h) => [...h, placements])
              onChange(future[future.length - 1])
              setFuture((f) => f.slice(0, -1))
              playSound('tap')
            }}
          >
            <Redo2 size={18} />
          </button>
          {action}
        </div>
      </div>
      <svg
        className="assembly-svg"
        viewBox={`${b.x - 2.9} ${b.y - 2.45} ${viewWidth} ${viewHeight}`}
        onPointerMove={(e) => {
          if (!drag.current) return
          const raw = draggedTo(localPoint(e)),
            snapped = snapFor(raw, current, screenScale(e.currentTarget))
          setLive(placements.map((v) => (v.id === raw.id ? raw : v)))
          setSnapPreview(
            raw.x !== snapped.x ||
              raw.y !== snapped.y ||
              raw.angle !== snapped.angle ||
              raw.flipped !== snapped.flipped
              ? snapped
              : null,
          )
        }}
        onPointerUp={(e) => {
          if (!drag.current) return
          const raw = draggedTo(localPoint(e)),
            snapped = snapFor(raw, current, screenScale(e.currentTarget)),
            aligned =
              raw.x !== snapped.x ||
              raw.y !== snapped.y ||
              raw.angle !== snapped.angle ||
              raw.flipped !== snapped.flipped
          commit(current.map((v) => (v.id === raw.id ? snapped : v)))
          playSound(aligned ? 'snap' : 'drop')
          drag.current = null
          setDraggingId(null)
          setLive(null)
          setSnapPreview(null)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDraggingId(null)
          setLive(null)
          setSnapPreview(null)
        }}
        role="img"
        aria-label={`${puzzle.name}组装画布`}
      >
        <path
          d={pathOf(target)}
          fill="#fff"
          fillRule="evenodd"
          stroke="#6e8479"
          strokeWidth=".028"
          strokeDasharray=".09 .07"
        />
        {(reveal
          ? puzzle.placements
          : hint
            ? puzzle.placements.filter((v) => v.id === 'large')
            : []
        ).map((p) => (
          <path
            key={`hint-${p.id}`}
            d={pathOf([polygon(placedRing(p))])}
            fill={piece(p.id).color}
            fillOpacity=".28"
            stroke="#557c6c"
            strokeWidth=".02"
            pointerEvents="none"
          />
        ))}
        {snapPreview && (
          <path
            d={pathOf([polygon(placedRing(snapPreview))])}
            fill="none"
            stroke="#2e7d6a"
            strokeWidth=".05"
            strokeDasharray=".12 .08"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}
        {sorted(current, (a, c) => Number(a.id === selected) - Number(c.id === selected)).map(
          (p) => (
            <path
              key={p.id}
              d={pathOf([polygon(placedRing(p))])}
              fill={piece(p.id).color}
              fillOpacity={draggingId === p.id ? 0.6 : 1}
              stroke={p.id === selected ? '#344c47' : '#fff'}
              strokeWidth={p.id === selected ? '.04' : '.024'}
              strokeLinejoin="round"
              className={disabled ? '' : 'movable-piece'}
              onPointerDown={(e) => {
                if (disabled) return
                e.preventDefault()
                setSelected(p.id)
                playSound('pick')
                const svg = e.currentTarget.ownerSVGElement!
                svg.setPointerCapture(e.pointerId)
                const point = svg.createSVGPoint()
                point.x = e.clientX
                point.y = e.clientY
                const q = point.matrixTransform(svg.getScreenCTM()!.inverse())
                drag.current = { id: p.id, start: [q.x, q.y], original: p }
                setDraggingId(p.id)
                setLive(placements)
                setSnapPreview(null)
              }}
            >
              <title>{piece(p.id).name}</title>
            </path>
          ),
        )}
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
      </svg>
      <div className="piece-selector" aria-label="选择拼板">
        {PIECES.map((p) => (
          <button
            key={p.id}
            className={selected === p.id ? 'selected' : ''}
            onClick={() => {
              playSound('pick')
              setSelected(p.id)
            }}
            style={{ '--piece-color': p.color } as React.CSSProperties}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="canvas-note">
        <Magnet size={15} />
        {snapPreview ? '松开就能吸附到位' : `靠近边缘自动吸附 · 已选：${piece(selected).name}`}
      </p>
    </div>
  )
}
