import { useMemo, useRef, useState } from 'react'
import { Check, Eraser, FlipHorizontal2, Move, Pencil, Redo2, RotateCcw, RotateCw, Undo2, ZoomIn, X, CircleDashed, Magnet } from 'lucide-react'
import type { MultiPolygon } from 'polygon-clipping'
import { PIECES, bounds, containsPoint, distance, pathOf, piece, placedRing, polygon, project, rayIntersections, round, silhouette, snapPlacement, snapPoint, strokePath, strokePoints, vertexPoints } from '../geometry'
import type { Placement, Point, Stroke, TangramPuzzle } from '../types'

export function MiniTangram({ puzzle, colored = false, className = '' }: { puzzle: TangramPuzzle; colored?: boolean; className?: string }) {
  const target = silhouette(puzzle.placements), b = bounds(target), pad = .2
  return <svg className={className} viewBox={`${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`} aria-label={puzzle.name} role="img">
    {colored ? puzzle.placements.map(p => <path key={p.id} d={pathOf([polygon(placedRing(p))])} fill={piece(p.id).color} stroke="#fffaf2" strokeWidth=".025" strokeLinejoin="round" />) : <path d={pathOf(target)} fill="currentColor" fillRule="evenodd" />}
  </svg>
}
function localPoint(event: React.PointerEvent<SVGSVGElement>): Point {
  const svg = event.currentTarget; if (!svg) return [0, 0]
  const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY
  const ctm = svg.getScreenCTM(); if (!ctm) return [0, 0]
  const value = p.matrixTransform(ctm.inverse()); return [value.x, value.y]
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function DrawCanvas({ puzzle, strokes, onChange, reveal, hint, compact = false, disabled = false, view, bad, badStroke, onCheck }: { puzzle: TangramPuzzle; strokes: Stroke[]; onChange: (s: Stroke[]) => void; reveal: boolean; hint: boolean; compact?: boolean; disabled?: boolean; view?: { width: number; height: number }; bad?: MultiPolygon | null; badStroke?: number; onCheck?: () => void }) {
  const [tool, setTool] = useState<'line' | 'arc' | 'erase'>('line'), [side, setSide] = useState(1)
  const [preview, setPreview] = useState<Stroke | null>(null), [hover, setHover] = useState<{ p: Point; snapped: boolean } | null>(null), [expanded, setExpanded] = useState(false)
  const [future, setFuture] = useState<Stroke[][]>([]), [history, setHistory] = useState<Stroke[][]>([])
  const target = useMemo(() => silhouette(puzzle.placements), [puzzle.placements]), b = bounds(target), pad = .5
  // One shared viewport per question keeps identical pieces the same size on every board.
  const width = view?.width ?? b.width + pad * 2, height = view?.height ?? b.height + pad * 2
  const viewBox = `${b.x + b.width / 2 - width / 2} ${b.y + b.height / 2 - height / 2} ${width} ${height}`
  const active = useRef(false)
  const anchors = useMemo(() => [...vertexPoints(target), ...strokes.flatMap(s => [s.a, s.b])], [target, strokes])
  const boundarySegments = useMemo(() => target.flatMap(poly => poly).flatMap(ring => ring.slice(1).map((point, i) => [ring[i], point] as [Point, Point])), [target])
  function boundaryGap(p: Point) {
    let best = Infinity
    for (const [a, c] of boundarySegments) {
      const dx = c[0] - a[0], dy = c[1] - a[1], denominator = dx * dx + dy * dy
      const t = denominator ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator)) : 0
      const gap = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
      if (gap < best) best = gap
    }
    return best
  }
  // Semicircles between the same endpoints differ only by bulge direction: pick the one that hugs the visible outline.
  function autoArcSide(a: Point, c: Point): number | null {
    if (distance(a, c) < .15) return null
    const probe = (s: number) => {
      const points = strokePoints({ kind: 'arc', a, b: c, side: s }), middle = points[Math.floor(points.length / 2)]
      return { middle, inside: containsPoint(middle, target), gap: boundaryGap(middle) }
    }
    const up = probe(1), down = probe(-1)
    if (up.inside !== down.inside) return up.inside ? 1 : -1
    if (Math.abs(up.gap - down.gap) > .12) return up.gap < down.gap ? 1 : -1
    return null
  }
  // An endpoint is "connected" once it sits on the outline or another line.
  const endpoints = useMemo(() => strokes.map((s, i) => {
    const others = strokes.filter((_, j) => j !== i)
    return [s.a, s.b].map(p => distance(p, snapPoint(p, target, others, .05)) < 1e-6)
  }), [target, strokes])
  function commit(next: Stroke[]) { setHistory(h => [...h, clone(strokes)]); setFuture([]); onChange(next) }
  function resolve(e: React.PointerEvent<SVGSVGElement>, start?: Point): { p: Point; snapped: boolean } {
    const p = localPoint(e), rect = e.currentTarget.getBoundingClientRect(), scale = Math.min(rect.width / width, rect.height / height) || 1
    const anchorThreshold = 18 / scale, rulerThreshold = 12 / scale
    if (!start) {
      const first = snapPoint(p, target, strokes, anchorThreshold)
      if (distance(first, p) > .00001) return { p: first, snapped: true }
      // Auxiliary ruler distances derive only from visible boundary vertices.
      const candidate: Point[] = vertexPoints(target).flatMap(v => [0, .5, 1, Math.SQRT2, Math.SQRT2 - 1, 1 / Math.SQRT2].flatMap(d => [[v[0] + d, v[1]], [v[0] - d, v[1]], [v[0], v[1] + d], [v[0], v[1] - d]] as Point[]))
      let best = first, diff = rulerThreshold
      for (const q of candidate) if (distance(q, p) < diff) { diff = distance(q, p); best = q }
      if (distance(best, first) > 1e-9) return { p: best, snapped: true }
      return { p, snapped: false }
    }
    // Direction is locked first, then the endpoint glides along that one line.
    const angle = Math.atan2(p[1] - start[1], p[0] - start[0]), locked = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4), length = distance(p, start)
    const dx = Math.cos(locked), dy = Math.sin(locked), magnet = 26 / scale, corridor = 8 / scale
    let best: Point | null = null, bestGap = magnet
    const anchorCandidates = [...vertexPoints(target), ...strokes.flatMap(s => [s.a, s.b])]
    for (const q of anchorCandidates) {
      const rx = q[0] - start[0], ry = q[1] - start[1], along = rx * dx + ry * dy, off = Math.abs(rx * dy - ry * dx)
      if (along < .05 || off > corridor) continue
      const gap = Math.hypot(along - length, off)
      if (gap < bestGap) { bestGap = gap; best = q }
    }
    for (const h of rayIntersections(start, locked, target, strokes)) {
      const gap = Math.abs(distance(h, start) - length)
      if (gap < bestGap) { bestGap = gap; best = h }
    }
    if (best) return { p: best, snapped: true }
    // The pen cannot leave the figure: the first outline crossing ends the stroke.
    let stop: Point | null = null, stopAlong = Infinity
    for (const h of rayIntersections(start, locked, target, [])) {
      const along = distance(h, start)
      if (along > .05 && along <= length + magnet && along < stopAlong) { stopAlong = along; stop = h }
    }
    if (stop) return { p: stop, snapped: true }
    if (length > .02) return { p: [round(start[0] + dx * length), round(start[1] + dy * length)], snapped: false }
    return { p, snapped: false }
  }
  function down(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
    const p = resolve(e).p
    if (tool === 'erase') {
      const index = strokes.findIndex(s => strokePoints(s).some((v, i, arr) => i && distance(p, project(p, arr[i - 1], v)) < .18))
      if (index >= 0) commit(strokes.filter((_, i) => i !== index))
      return
    }
    active.current = true; setPreview({ kind: tool, a: p, b: p, side })
  }
  function up(e: React.PointerEvent<SVGSVGElement>) {
    if (!active.current || !preview) return
    active.current = false
    const next = { ...preview, b: resolve(e, preview.kind === 'line' ? preview.a : undefined).p }
    if (next.kind === 'arc') next.side = autoArcSide(next.a, next.b) ?? next.side
    if (distance(next.a, next.b) > .08) commit([...strokes, next])
    setPreview(null)
  }
  const content = <>
    <div className="draw-tools" role="toolbar" aria-label={`${puzzle.name}画线工具`}>
      <button className={tool === 'line' ? 'tool active' : 'tool'} aria-label="直线" title="直线" onClick={() => setTool('line')} disabled={disabled}><Pencil size={17} /></button>
      <button className={tool === 'arc' ? 'tool active' : 'tool'} aria-label="半圆弧" title="半圆弧：拖出直径" onClick={() => setTool('arc')} disabled={disabled}><CircleDashed size={18} /></button>
      {tool === 'arc' && <button className="tool" title="换弧向" aria-label="换弧向" onClick={() => setSide(-side)}><FlipHorizontal2 size={17} /></button>}
      <button className={tool === 'erase' ? 'tool active' : 'tool'} aria-label="擦除" title="擦除" onClick={() => setTool('erase')} disabled={disabled}><Eraser size={17} /></button>
      <span className="tool-separator" />
      <button className="tool" aria-label="撤销画线" disabled={!history.length || disabled} onClick={() => { const last = history[history.length - 1]; setFuture(f => [...f, strokes]); setHistory(h => h.slice(0, -1)); onChange(last) }}><Undo2 size={17} /></button>
      <button className="tool" aria-label="重做画线" disabled={!future.length || disabled} onClick={() => { const last = future[future.length - 1]; setHistory(h => [...h, strokes]); setFuture(f => f.slice(0, -1)); onChange(last) }}><Redo2 size={17} /></button>
      <button className="tool" aria-label="清空本图" title="清空本图" disabled={!strokes.length || disabled} onClick={() => commit([])}><RotateCcw size={17} /></button>
    </div>
    <svg className="drawing-svg" viewBox={viewBox} style={{ '--board-ratio': `${width} / ${height}` } as React.CSSProperties} onPointerDown={down} onPointerMove={e => { const moved = resolve(e, active.current && preview?.kind === 'line' ? preview.a : undefined); setHover(moved); if (active.current) { const end = moved.p; setPreview(prev => prev ? { ...prev, b: end, side: prev.kind === 'arc' ? autoArcSide(prev.a, end) ?? prev.side : prev.side } : null) } }} onPointerUp={up} onPointerCancel={() => { active.current = false; setPreview(null) }} onPointerLeave={() => setHover(null)} role="img" aria-label={`${puzzle.name}画线区`}>
      <path d={pathOf(target)} fill="#fffdf7" fillRule="evenodd" stroke="#344c47" strokeWidth=".026" strokeLinejoin="round" />
      {(reveal ? puzzle.placements : hint ? puzzle.placements.filter(p => p.id === 'large') : []).map(p => <path key={p.id} d={pathOf([polygon(placedRing(p))])} fill={reveal ? piece(p.id).color : '#e4864333'} fillOpacity={reveal ? .72 : 1} stroke="#42645a" strokeWidth=".018" />)}
      {bad && <path d={pathOf(bad)} fill="#e4574b" fillOpacity=".24" stroke="#c0392b" strokeWidth=".022" strokeLinejoin="round" pointerEvents="none" />}
      {strokes.map((s, i) => <path key={i} d={strokePath(s)} fill="none" stroke={i === badStroke ? '#c0392b' : '#117d70'} strokeWidth={i === badStroke ? '.04' : '.028'} strokeLinecap="round" />)}
      {preview && <path d={strokePath(preview)} fill="none" stroke="#e98c3d" strokeWidth=".032" strokeDasharray=".06 .04" />}
      {(hover || active.current) && anchors.map((p, i) => <circle key={`a${i}`} cx={p[0]} cy={p[1]} r=".07" fill="#2f5a4c" fillOpacity=".45" pointerEvents="none" />)}
      {strokes.map((s, i) => [s.a, s.b].map((p, n) => <circle key={`e${i}-${n}`} cx={p[0]} cy={p[1]} r=".06" fill={endpoints[i][n] ? '#2e7d6a' : '#e98c3d'} stroke="#fffdf7" strokeWidth=".014" pointerEvents="none" />))}
      {hover && !disabled && <circle cx={hover.p[0]} cy={hover.p[1]} r={hover.snapped ? '.085' : '.045'} fill={hover.snapped ? 'none' : '#e98c3d'} stroke="#e98c3d" strokeWidth={hover.snapped ? '.028' : '0'} pointerEvents="none" />}
    </svg>
  </>
  return <section className={`draw-board ${compact ? 'compact' : ''}`}>
    <div className="board-heading"><span>{puzzle.name}</span><span className="board-actions">{onCheck && <button className="tool" title="检查本图" aria-label={`检查${puzzle.name}`} onClick={onCheck} disabled={disabled}><Check size={18} /></button>}<button className="tool" onClick={() => setExpanded(true)} aria-label={`放大${puzzle.name}`}><ZoomIn size={18} /></button></span></div>
    {expanded ? <div className="canvas-overlay" role="dialog" aria-modal="true" aria-label={`放大${puzzle.name}`}><div className="expanded-board"><div className="board-heading"><strong>{puzzle.name}</strong><button className="tool" aria-label="关闭放大" onClick={() => setExpanded(false)}><X /></button></div>{content}<p className="canvas-note">拖出直线自动对齐 45° 角，靠近顶点或线时松手即吸附。完成后关闭，继续其他图形。</p></div></div> : content}
  </section>
}
export function AssemblyCanvas({ puzzle, placements, onChange, reveal, hint, disabled = false }: { puzzle: TangramPuzzle; placements: Placement[]; onChange: (p: Placement[]) => void; reveal: boolean; hint: boolean; disabled?: boolean }) {
  const [selected, setSelected] = useState<Placement['id']>('large'), [live, setLive] = useState<Placement[] | null>(null), [snapPreview, setSnapPreview] = useState<Placement | null>(null), [history, setHistory] = useState<Placement[][]>([]), [future, setFuture] = useState<Placement[][]>([])
  const drag = useRef<{ id: Placement['id']; start: Point; original: Placement } | null>(null)
  const target = silhouette(puzzle.placements), b = bounds(target), current = live || placements, viewWidth = b.width + 6.6, viewHeight = b.height + 5.5
  // The SVG letterboxes its viewBox, so the limiting side may be the height.
  function screenScale(svg: SVGSVGElement) { const r = svg.getBoundingClientRect(); return Math.min(r.width / viewWidth, r.height / viewHeight) || 1 }
  function draggedTo(q: Point) { const { original, start } = drag.current!; return { ...original, x: original.x + q[0] - start[0], y: original.y + q[1] - start[1] } }
  function snapFor(p: Placement, all: Placement[], scale: number) { return snapPlacement(p, all.filter(v => v.id !== p.id), target, puzzle.placements, 20 / scale, 34 / scale) }
  function commit(next: Placement[]) { setHistory(h => [...h, clone(placements)]); setFuture([]); onChange(next) }
  function changeSelected(angle: number, flip = false) {
    const p = placements.find(v => v.id === selected)!, ring = placedRing(p), center: Point = [ring.reduce((s, q) => s + q[0], 0) / ring.length, ring.reduce((s, q) => s + q[1], 0) / ring.length]
    const a = angle * Math.PI / 180, dx = p.x - center[0], dy = p.y - center[1]
    let next = { ...p, x: center[0] + dx * Math.cos(a) - dy * Math.sin(a), y: center[1] + dx * Math.sin(a) + dy * Math.cos(a), angle: p.angle + angle }
    if (flip) {
      const flipped = { ...p, flipped: !p.flipped }, points = placedRing(flipped), c: Point = [points.reduce((s, q) => s + q[0], 0) / points.length, points.reduce((s, q) => s + q[1], 0) / points.length]
      next = { ...flipped, x: flipped.x + center[0] - c[0], y: flipped.y + center[1] - c[1] }
    }
    commit(placements.map(v => v.id === selected ? next : v))
  }
  return <div className="assembly-board">
    <div className="assembly-toolbar"><span><Move size={16} />拖动拼板，点击选中</span><div className="toolbar-actions">
      <button className="secondary" onClick={() => changeSelected(-45)} disabled={disabled} aria-label="逆时针旋转45度"><RotateCcw size={17} />45°</button>
      <button className="secondary" onClick={() => changeSelected(45)} disabled={disabled} aria-label="顺时针旋转45度"><RotateCw size={17} />45°</button>
      <button className="secondary" onClick={() => changeSelected(0, true)} disabled={disabled}><FlipHorizontal2 size={17} />翻面</button>
      <label className="angle-control">角度<input type="number" step="15" aria-label="选中拼板角度" value={Math.round(current.find(p => p.id === selected)!.angle % 360)} disabled={disabled} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value)) changeSelected(value - placements.find(p => p.id === selected)!.angle) }} />°</label>
      <button className="tool" aria-label="撤销组装" disabled={!history.length || disabled} onClick={() => { setFuture(f => [...f, placements]); onChange(history[history.length - 1]); setHistory(h => h.slice(0, -1)) }}><Undo2 size={18} /></button>
      <button className="tool" aria-label="重做组装" disabled={!future.length || disabled} onClick={() => { setHistory(h => [...h, placements]); onChange(future[future.length - 1]); setFuture(f => f.slice(0, -1)) }}><Redo2 size={18} /></button>
    </div></div>
    <svg className="assembly-svg" viewBox={`${b.x - 3.3} ${b.y - 2.3} ${viewWidth} ${viewHeight}`} onPointerMove={e => { if (!drag.current) return; const raw = draggedTo(localPoint(e)), snapped = snapFor(raw, current, screenScale(e.currentTarget)); setLive(placements.map(v => v.id === raw.id ? raw : v)); setSnapPreview(raw.x !== snapped.x || raw.y !== snapped.y || raw.angle !== snapped.angle || raw.flipped !== snapped.flipped ? snapped : null) }} onPointerUp={e => { if (!drag.current) return; const raw = draggedTo(localPoint(e)), snapped = snapFor(raw, current, screenScale(e.currentTarget)); commit(current.map(v => v.id === raw.id ? snapped : v)); drag.current = null; setLive(null); setSnapPreview(null) }} onPointerCancel={() => { drag.current = null; setLive(null); setSnapPreview(null) }} role="img" aria-label={`${puzzle.name}组装画布`}>
      <path d={pathOf(target)} fill="#edf0e6" fillRule="evenodd" stroke="#96a69b" strokeWidth=".022" strokeDasharray=".08 .06" />
      {(reveal ? puzzle.placements : hint ? puzzle.placements.filter(v => v.id === 'large') : []).map(p => <path key={`hint-${p.id}`} d={pathOf([polygon(placedRing(p))])} fill={piece(p.id).color} fillOpacity=".28" stroke="#557c6c" strokeWidth=".02" pointerEvents="none" />)}
      {snapPreview && <path d={pathOf([polygon(placedRing(snapPreview))])} fill="none" stroke="#2e7d6a" strokeWidth=".05" strokeDasharray=".12 .08" strokeLinejoin="round" pointerEvents="none" />}
      {[...current].sort((a, c) => Number(a.id === selected) - Number(c.id === selected)).map(p => <path key={p.id} d={pathOf([polygon(placedRing(p))])} fill={piece(p.id).color} fillOpacity={drag.current?.id === p.id ? .6 : 1} stroke={p.id === selected ? '#344c47' : '#fffdf7'} strokeWidth={p.id === selected ? '.04' : '.024'} strokeLinejoin="round" className={disabled ? '' : 'movable-piece'} onPointerDown={e => { if (disabled) return; e.preventDefault(); setSelected(p.id); const svg = e.currentTarget.ownerSVGElement!; svg.setPointerCapture(e.pointerId); const point = svg.createSVGPoint(); point.x = e.clientX; point.y = e.clientY; const q = point.matrixTransform(svg.getScreenCTM()!.inverse()); drag.current = { id: p.id, start: [q.x, q.y], original: p }; setLive(placements); setSnapPreview(null) }}><title>{piece(p.id).name}</title></path>)}
    </svg>
    <div className="piece-selector" aria-label="选择拼板">{PIECES.map(p => <button key={p.id} className={selected === p.id ? 'selected' : ''} onClick={() => setSelected(p.id)} style={{ '--piece-color': p.color } as React.CSSProperties}>{p.name}</button>)}</div>
    <p className="canvas-note"><Magnet size={15} />{snapPreview ? '松开就能吸附到位' : `靠近边缘自动吸附 · 已选：${piece(selected).name}`}</p>
  </div>
}
