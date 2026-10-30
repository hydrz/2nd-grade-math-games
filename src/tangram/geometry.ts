import clipping, {
  type MultiPolygon,
  type Polygon,
  type Pair,
} from 'polygon-clipping';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js';
import GeoJSONWriter from 'jsts/org/locationtech/jts/io/GeoJSONWriter.js';
import Polygonizer from 'jsts/org/locationtech/jts/operation/polygonize/Polygonizer.js';
import GeometryNoder from 'jsts/org/locationtech/jts/noding/snapround/GeometryNoder.js';
import PrecisionModel from 'jsts/org/locationtech/jts/geom/PrecisionModel.js';
import ArrayList from 'jsts/java/util/ArrayList.js';
import { sorted } from '../core/collections';
const squaredDistance = (a: Point, b: Point) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
import type {
  CheckResult,
  PieceDefinition,
  Placement,
  Point,
  Stroke,
  TangramPuzzle,
} from '../core/types';

const SQ = Math.SQRT2;
export const round = (n: number) => Math.round(n * 1e7) / 1e7;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
const arc = (
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  steps = 64,
): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => [
    round(cx + r * Math.cos(from + ((to - from) * i) / steps)),
    round(cy + r * Math.sin(from + ((to - from) * i) / steps)),
  ]);
const closed = (ring: Point[]): Point[] => {
  const points = ring.filter((p, i) => !i || distance(p, ring[i - 1]) > 1e-8);
  return distance(points[0], points[points.length - 1]) < 1e-8
    ? points
    : [...points, points[0]];
};
export const PIECES: PieceDefinition[] = [
  {
    id: 'circle',
    name: '圆形板',
    color: '#ef7656',
    ring: arc(0, 0, 0.5, 0, Math.PI * 2, 128),
    anchors: [
      [0, 0],
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
    ],
  },
  {
    id: 'semi-a',
    name: '半圆板一',
    color: '#f2bb51',
    ring: arc(0, 0, 0.5, 0, Math.PI),
    anchors: [
      [-0.5, 0],
      [0.5, 0],
      [0, 0],
    ],
  },
  {
    id: 'semi-b',
    name: '半圆板二',
    color: '#e89cbe',
    ring: arc(0, 0, 0.5, 0, Math.PI),
    anchors: [
      [-0.5, 0],
      [0.5, 0],
      [0, 0],
    ],
  },
  {
    id: 'triangle',
    name: '三角板',
    color: '#53a8c6',
    ring: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    anchors: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  },
  {
    id: 'trapezoid',
    name: '梯形板',
    color: '#9290d4',
    ring: [
      [0, 0],
      [SQ, 0],
      [SQ - 1, 1],
      [0, 1],
    ],
    anchors: [
      [0, 0],
      [SQ, 0],
      [SQ - 1, 1],
      [0, 1],
    ],
  },
  {
    id: 'center',
    name: '中心板',
    color: '#58ad83',
    ring: [
      [0, 0],
      [2 * SQ, 0],
      [2 * SQ - 1, 1],
      [SQ - 1, 1],
      [1 / SQ, 1 / SQ],
    ],
    anchors: [
      [0, 0],
      [2 * SQ, 0],
      [2 * SQ - 1, 1],
      [SQ - 1, 1],
      [1 / SQ, 1 / SQ],
    ],
  },
  {
    id: 'large',
    name: '曲形大板',
    color: '#e48643',
    ring: [
      [0, 0],
      [2 * SQ, 0],
      [2 * SQ - 1, 1],
      [0, 1],
      ...arc(0, 0.5, 0.5, Math.PI / 2, -Math.PI / 2),
    ],
    anchors: [
      [0, 0],
      [2 * SQ, 0],
      [2 * SQ - 1, 1],
      [0, 1],
      [0, 0.5],
    ],
  },
].map((p) => ({ ...p, ring: closed(p.ring as Point[]) })) as PieceDefinition[];
export const piece = (id: Placement['id']) => PIECES.find((p) => p.id === id)!;
export function transformPoint(p: Point, placement: Placement): Point {
  const a = (placement.angle * Math.PI) / 180,
    x = placement.flipped ? -p[0] : p[0];
  return [
    round(x * Math.cos(a) - p[1] * Math.sin(a) + placement.x),
    round(x * Math.sin(a) + p[1] * Math.cos(a) + placement.y),
  ];
}
export const placedRing = (p: Placement) =>
  piece(p.id).ring.map((v) => transformPoint(v, p));
export function area(ring: Pair[]) {
  return (
    Math.abs(
      ring.reduce((sum, p, i) => {
        const q = ring[(i + 1) % ring.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2
  );
}
export const multiArea = (polys: MultiPolygon) =>
  polys.reduce(
    (sum, p) => sum + area(p[0]) - p.slice(1).reduce((s, r) => s + area(r), 0),
    0,
  );
export const polygon = (ring: Point[]): Polygon => [closed(ring)];
export function silhouette(placements: Placement[]): MultiPolygon {
  const polys = placements.map((p) => polygon(placedRing(p)));
  if (!polys.length) return [];
  return clipping
    .union(polys[0], ...polys.slice(1))
    .filter((p) => area(p[0]) > 0.000001)
    .map((p) => [p[0], ...p.slice(1).filter((r) => area(r) > 0.0001)]);
}
export function pathOf(polys: MultiPolygon): string {
  return polys
    .flatMap((p) => p.map((r) => `M${r.map((v) => v.join(',')).join('L')}Z`))
    .join('');
}
export function bounds(polys: MultiPolygon) {
  const pts = polys.flat(2),
    xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function checkAssembly(
  puzzle: TangramPuzzle,
  placements: Placement[],
): CheckResult {
  if (
    placements.length !== 7 ||
    new Set(placements.map((p) => p.id)).size !== 7
  )
    return { ok: false, message: '七块拼板都要用上，每块只能用一次。' };
  const target = silhouette(puzzle.placements),
    result = silhouette(placements);
  // Judge any valid tiling, not just the stored answer. The tolerance allows hairline seams:
  // because the seven pieces' total area equals the target, any remaining overlap is bounded by
  // the uncovered area, so checking the covered outline is enough to keep wrong tilings out.
  const tolerance = Math.max(0.05, multiArea(target) * 0.022);
  const outside = clipping.difference(result, target);
  if (multiArea(outside) > tolerance)
    return {
      ok: false,
      message: '还有拼板在轮廓外面，移动一下再试试。',
      regions: outside,
    };
  const gap = clipping.difference(target, result);
  if (multiArea(gap) > tolerance) {
    const overlap =
      placements.reduce((s, p) => s + area(placedRing(p)), 0) -
      multiArea(result);
    return {
      ok: false,
      message:
        overlap > tolerance * 0.4
          ? '有拼板叠在一起了，试着把它们分开。'
          : '轮廓里还有空隙，仔细看看边缘。',
      regions: gap,
    };
  }
  return { ok: true, message: '七块拼板严丝合缝，拼得真棒！' };
}
export function strokePoints(stroke: Stroke): Point[] {
  if (stroke.kind === 'line') return [stroke.a, stroke.b];
  const cx = (stroke.a[0] + stroke.b[0]) / 2,
    cy = (stroke.a[1] + stroke.b[1]) / 2;
  const r = distance(stroke.a, stroke.b) / 2,
    angle = Math.atan2(stroke.a[1] - cy, stroke.a[0] - cx);
  return arc(cx, cy, r, angle, angle + Math.PI * (stroke.side || 1));
}
export const strokePath = (s: Stroke) =>
  `M${strokePoints(s)
    .map((p) => p.join(','))
    .join('L')}`;
export function containsPoint(p: Point, polys: MultiPolygon) {
  const insideRing = (r: Point[]) => {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (
        r[i][1] > p[1] !== r[j][1] > p[1] &&
        p[0] <
          ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) +
            r[i][0]
      )
        inside = !inside;
    return inside;
  };
  return polys.some(
    (poly) => insideRing(poly[0]) && !poly.slice(1).some(insideRing),
  );
}
function centroid(ring: Point[]): Point {
  let x = 0,
    y = 0,
    weight = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i],
      b = ring[i + 1],
      w = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * w;
    y += (a[1] + b[1]) * w;
    weight += w;
  }
  return [x / (3 * weight), y / (3 * weight)];
}
/** Smallest symmetric difference between a divided region and one standard piece. */
function congruenceError(region: Polygon, def: PieceDefinition) {
  if (region.length !== 1) return Infinity;
  const areaGap = Math.abs(area(region[0]) - area(def.ring));
  if (areaGap > 0.09) return areaGap + 1;
  const center = centroid(region[0]),
    origin = centroid(def.ring);
  // Find orientation from long straight edges, also allowing non-grid valid answers.
  const angles = new Set(Array.from({ length: 8 }, (_, i) => i * 45));
  for (let i = 1; i < region[0].length; i++)
    if (distance(region[0][i - 1], region[0][i]) > 0.2) {
      const a =
        (Math.atan2(
          region[0][i][1] - region[0][i - 1][1],
          region[0][i][0] - region[0][i - 1][0],
        ) *
          180) /
        Math.PI;
      for (let j = 1; j < def.ring.length; j++)
        if (distance(def.ring[j - 1], def.ring[j]) > 0.2) {
          const b =
            (Math.atan2(
              def.ring[j][1] - def.ring[j - 1][1],
              def.ring[j][0] - def.ring[j - 1][0],
            ) *
              180) /
            Math.PI;
          angles.add(a - b);
          angles.add(a + b - 180);
        }
    }
  let best = Infinity;
  for (const flipped of [false, true])
    for (const angle of angles) {
      const temp: Placement = { id: def.id, x: 0, y: 0, angle, flipped },
        c = transformPoint(origin, temp);
      const ring = def.ring.map((p) =>
        transformPoint(p, {
          ...temp,
          x: center[0] - c[0],
          y: center[1] - c[1],
        }),
      );
      const error = multiArea(clipping.xor(region, polygon(ring)));
      if (error < best) best = error;
    }
  return best;
}
const perimeters = new Map<string, number>();
function congruent(region: Polygon, def: PieceDefinition) {
  let perimeter = perimeters.get(def.id);
  if (perimeter === undefined) {
    perimeter = def.ring.reduce(
      (sum, p, i) => (i ? sum + distance(p, def.ring[i - 1]) : 0),
      0,
    );
    perimeters.set(def.id, perimeter);
  }
  // Hand-drawn lines land a few pixels off; allow a small share of the piece's outline.
  return congruenceError(region, def) < Math.max(0.02, perimeter * 0.04);
}
function hasLooseEdge(collection: {
  iterator(): { hasNext(): boolean; next(): jsts.geom.Geometry };
}) {
  for (const it = collection.iterator(); it.hasNext();)
    if (it.next().getLength() > 10) return true;
  return false;
}
export function checkDrawing(
  puzzle: TangramPuzzle,
  strokes: Stroke[],
): CheckResult {
  try {
    const target = silhouette(puzzle.placements);
    const boundary = target.flatMap((p) => p);
    for (let si = 0; si < strokes.length; si++) {
      const points = strokePoints(strokes[si]);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          steps = Math.ceil(distance(a, b) / 0.02);
        for (let n = 0; n <= steps; n++) {
          const p: Point = [
            a[0] + ((b[0] - a[0]) * n) / Math.max(steps, 1),
            a[1] + ((b[1] - a[1]) * n) / Math.max(steps, 1),
          ];
          if (containsPoint(p, target)) continue;
          const onEdge = boundary.some((r) =>
            r.some((v, j) => j && distance(p, project(p, r[j - 1], v)) < 0.002),
          );
          if (!onEdge)
            return {
              ok: false,
              message: '有分割线画到了轮廓外面，擦掉后再试试。',
              strokeIndex: si,
            };
        }
      }
    }
    const reader = new GeoJSONReader(),
      writer = new GeoJSONWriter();
    // Integer topology coordinates avoid microscopic gaps at coincident arc/line joints.
    const topologyScale = 100000;
    const lines = [...boundary, ...strokes.map(strokePoints)].map((r) =>
      r.map((p) => [
        Math.round(p[0] * topologyScale),
        Math.round(p[1] * topologyScale),
      ]),
    );
    const linework = reader.read({
      type: 'MultiLineString',
      coordinates: lines,
    });
    const list = new ArrayList();
    list.add(linework);
    const noded = new GeometryNoder(new PrecisionModel(1)).node(list),
      unique = new Map<string, Point[]>();
    for (const it = noded.iterator(); it.hasNext();) {
      const coords = (
        writer.write(it.next()) as { coordinates: Point[] }
      ).coordinates.map((p) => [Math.round(p[0]), Math.round(p[1])] as Point);
      for (let i = 1; i < coords.length; i++) {
        const a = coords[i - 1],
          b = coords[i];
        if (distance(a, b) < 1) continue;
        const key = sorted([a.join(','), b.join(',')]).join('|');
        unique.set(key, [a, b]);
      }
    }
    const network = reader.read({
      type: 'MultiLineString',
      coordinates: [...unique.values()],
    });
    const polygonizer = new Polygonizer();
    polygonizer.add(network);
    const faces: Polygon[] = [];
    for (const it = polygonizer.getPolygons().iterator(); it.hasNext();) {
      const coordinates = (
        writer.write(it.next()) as { coordinates: Polygon }
      ).coordinates.map((r) =>
        r.map((p) => [p[0] / topologyScale, p[1] / topologyScale] as Point),
      );
      const inside = clipping.intersection(coordinates, target);
      if (
        // Ignore hairline slivers created by lines that just miss each other.
        multiArea(inside) > 0.004 &&
        Math.abs(multiArea(inside) - multiArea([coordinates])) < 0.002
      )
        faces.push(coordinates);
    }
    if (
      hasLooseEdge(polygonizer.getDangles()) ||
      hasLooseEdge(polygonizer.getCutEdges())
    )
      return {
        ok: false,
        message: '有一条线还没接好，请把端点接到轮廓或其他线上。',
      };
    if (faces.length !== 7)
      return {
        ok: false,
        message: `现在分出了${faces.length}块，需要恰好七块拼板。`,
      };
    const choices = faces.map((f) =>
      PIECES.map((p, i) => (congruent(f, p) ? i : -1)).filter((i) => i >= 0),
    );
    const match = (n: number, used: number): boolean =>
      n === 7 ||
      choices[n].some(
        (i) => !(used & (1 << i)) && match(n + 1, used | (1 << i)),
      );
    if (!match(0, 0)) {
      const bad = faces.filter((_, i) => choices[i].length === 0);
      const near = bad.length
        ? Math.min(
            ...bad.flatMap((f) =>
              PIECES.map((piece) => congruenceError(f, piece)),
            ),
          )
        : Infinity;
      return {
        ok: false,
        message:
          near < 0.02
            ? '有几块只差一点点——把线的端点对准圆点、接牢再试试。'
            : '分出了七块，但有的块大小或形状不合适，再调整一下分法。',
        regions: bad.length ? bad : undefined,
      };
    }
    if (
      multiArea(
        clipping.xor(target, clipping.union(faces[0], ...faces.slice(1))),
      ) > 0.02
    )
      return { ok: false, message: '还有一部分没有正确分解。' };
    return {
      ok: true,
      message: '七块形状和大小全部正确，你找到了一种好分法！',
    };
  } catch {
    return { ok: false, message: '有些线还没有连接完整，撤销最近一笔再试试。' };
  }
}
const localRing = (p: Placement) =>
  piece(p.id).ring.map((v) => transformPoint(v, { ...p, x: 0, y: 0 }));
function directedGap(from: Point[], to: Point[]) {
  return from.reduce(
    (m, p) => Math.max(m, Math.min(...to.map((q) => distance(p, q)))),
    0,
  );
}
function ringGap(a: Point[], b: Point[]) {
  return Math.max(directedGap(a, b), directedGap(b, a));
}
const interchangeable = (a: Placement['id'], b: Placement['id']) =>
  a === b ||
  ((a === 'semi-a' || a === 'semi-b') && (b === 'semi-a' || b === 'semi-b'));
function sameOrientation(p: Placement, t: Placement) {
  // The circle is rotationally symmetric, so any angle is equivalent.
  if (p.id === 'circle' || t.id === 'circle') return p.id === t.id;
  return ringGap(localRing(p), localRing(t)) < 1e-4;
}
/**
 * Snap a dragged piece onto its matching answer slot when its orientation already agrees,
 * or, as a fallback, by supporting consensus between several anchors instead of one nearest pair.
 */
export function snapPlacement(
  p: Placement,
  others: Placement[],
  boundary: MultiPolygon,
  slots: Placement[],
  threshold: number,
  slotThreshold: number,
): Placement {
  const center = centroid(placedRing(p));
  let slot: Placement | null = null,
    nearestSlot = slotThreshold;
  for (const t of slots) {
    if (!interchangeable(p.id, t.id) || !sameOrientation(p, t)) continue;
    const occupied = others.some(
      (o) =>
        interchangeable(o.id, t.id) &&
        distance([o.x, o.y], [t.x, t.y]) < 0.05 &&
        sameOrientation(o, t),
    );
    if (occupied) continue;
    const d = distance(center, centroid(placedRing(t)));
    if (d < nearestSlot) {
      nearestSlot = d;
      slot = t;
    }
  }
  if (slot) return { ...p, x: slot.x, y: slot.y };

  const anchors = piece(p.id).anchors.map((v) => transformPoint(v, p));
  const fixed = [
    ...others.flatMap((o) =>
      piece(o.id).anchors.map((v) => transformPoint(v, o)),
    ),
    ...boundary.flat(2),
  ];
  if (!fixed.length) return p;
  const limit = threshold * threshold,
    epsilon = Math.max(threshold * 0.2, 0.02),
    epsilon2 = epsilon * epsilon;
  const candidates: Point[] = [];
  for (const a of anchors) {
    const near = sorted(
      fixed.flatMap((v) => {
        const d = squaredDistance(a, v);
        return d <= limit ? [{ v, d }] : [];
      }),
      (x, y) => x.d - y.d,
    ).slice(0, 3);
    for (const { v } of near) candidates.push([v[0] - a[0], v[1] - a[1]]);
  }
  let bestDelta: Point | null = null,
    bestSupport = 0,
    bestCost = Infinity;
  const seen = new Set<string>();
  for (const delta of candidates) {
    const key = `${Math.round(delta[0] * 1e6)},${Math.round(delta[1] * 1e6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let support = 0,
      cost = 0;
    for (const a of anchors) {
      const moved: Point = [a[0] + delta[0], a[1] + delta[1]];
      let nearest = Infinity;
      for (const v of fixed)
        nearest = Math.min(nearest, squaredDistance(moved, v));
      if (nearest <= epsilon2) support++;
      cost += nearest;
    }
    if (support > bestSupport || (support === bestSupport && cost < bestCost)) {
      bestSupport = support;
      bestCost = cost;
      bestDelta = delta;
    }
  }
  if (bestDelta && bestSupport)
    return { ...p, x: p.x + bestDelta[0], y: p.y + bestDelta[1] };
  // No corner alignment: press one corner flush against a neighbouring edge instead.
  let edgeDelta: Point | null = null,
    edgeGap = Infinity;
  const rings = [
    ...others.map((o) => placedRing(o)),
    ...boundary.flatMap((poly) => poly),
  ];
  for (const a of anchors) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        const q = project(a, ring[i - 1], ring[i]),
          d = distance(a, q);
        if (d < edgeGap) {
          edgeGap = d;
          edgeDelta = [q[0] - a[0], q[1] - a[1]];
        }
      }
    }
  }
  if (edgeDelta && edgeGap <= threshold)
    return { ...p, x: p.x + edgeDelta[0], y: p.y + edgeDelta[1] };
  return p;
}
export function project(p: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    denominator = dx * dx + dy * dy;
  const t = denominator
    ? Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator),
      )
    : 0;
  return [round(a[0] + t * dx), round(a[1] + t * dy)];
}
/** Visible corner points of the silhouette: arc joints, sharp corners and ring starts. */
export function vertexPoints(target: MultiPolygon): Point[] {
  const points: Point[] = [];
  for (const poly of target)
    for (const ring of poly) {
      const n = ring.length - 1;
      for (let i = 0; i < n; i++) {
        const prev = ring[(i - 1 + n) % n] as Point,
          point = ring[i] as Point,
          next = ring[(i + 1) % n] as Point;
        // Dense arc sampling hides joints between two arcs; a sharp turn marks the real corner.
        const ax = point[0] - prev[0],
          ay = point[1] - prev[1],
          bx = next[0] - point[0],
          by = next[1] - point[1];
        const turn = Math.atan2(Math.abs(ax * by - ay * bx), ax * bx + ay * by);
        if (i === 0 || distance(point, prev) > 0.12 || turn > 0.44)
          points.push(point);
      }
    }
  return points.filter(
    (p, i) => points.findIndex((q) => distance(p, q) < 1e-6) === i,
  );
}
/** Forward intersections of a ray with the outline and existing cut lines. */
export function rayIntersections(
  start: Point,
  angle: number,
  target: MultiPolygon,
  strokes: Stroke[],
): Point[] {
  const dx = Math.cos(angle),
    dy = Math.sin(angle),
    out: Point[] = [];
  for (const ring of [
    ...target.flatMap((p) => p),
    ...strokes.map(strokePoints),
  ])
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1],
        b = ring[i],
        ex = b[0] - a[0],
        ey = b[1] - a[1],
        denominator = dx * ey - dy * ex;
      if (Math.abs(denominator) < 1e-9) continue;
      const t = ((a[0] - start[0]) * ey - (a[1] - start[1]) * ex) / denominator,
        u = ((a[0] - start[0]) * dy - (a[1] - start[1]) * dx) / denominator;
      if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9)
        out.push([round(start[0] + dx * t), round(start[1] + dy * t)]);
    }
  return out;
}
export function snapPoint(
  p: Point,
  target: MultiPolygon,
  strokes: Stroke[],
  threshold: number,
): Point {
  const anchors = [
    ...vertexPoints(target),
    ...strokes.flatMap((s) => [s.a, s.b]),
  ];
  let nearest: Point | undefined,
    nearestDistance = Infinity;
  for (const q of anchors) {
    const d = distance(q, p);
    if (d < nearestDistance) {
      nearest = q;
      nearestDistance = d;
    }
  }
  if (nearest && nearestDistance < threshold) return nearest;
  let best = p,
    d = threshold;
  for (const r of [...target.flatMap((v) => v), ...strokes.map(strokePoints)])
    for (let i = 1; i < r.length; i++) {
      const q = project(p, r[i - 1], r[i]),
        next = distance(p, q);
      if (next < d) {
        best = q;
        d = next;
      }
    }
  return best;
}
