import references from './data/reference.json'
import originals from './data/originals.json'
import { bounds, silhouette } from './geometry'
import type { Placement, TangramPuzzle } from './types'
export function normalized(placements: Placement[]): Placement[] { const b = bounds(silhouette(placements)); return placements.map(p => ({ ...p, x: p.x - b.x, y: p.y - b.y })) }
export const TANGRAMS: TangramPuzzle[] = ([...references, ...originals] as TangramPuzzle[]).map(p => ({ ...p, placements: normalized(p.placements) }))
export const drawingGroup = (index: number) => [0, 3, 7, 12].map(offset => TANGRAMS[(index * 2 + offset) % 24])
