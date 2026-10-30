import { describe, expect, it } from 'vitest'
import { PIECES, area, checkAssembly, checkDrawing, placedRing, silhouette, multiArea } from './geometry'
import { TANGRAMS, drawingGroup } from './tangrams'
import type { Stroke, TangramPuzzle } from './types'

function seams(puzzle: TangramPuzzle): Stroke[] {
  return puzzle.placements.flatMap(p => {
    const ring = placedRing(p)
    return ring.slice(1).map((b, i) => ({ kind: 'line' as const, a: ring[i], b }))
  })
}
describe('complete puzzle catalog', () => {
  it('contains 13 reference silhouettes and 11 independently recomposed silhouettes', () => {
    expect(TANGRAMS).toHaveLength(24)
    expect(TANGRAMS.filter(p => p.source === 'reference')).toHaveLength(13)
    expect(TANGRAMS.filter(p => p.source === 'original')).toHaveLength(11)
    expect(new Set(TANGRAMS.map(p => p.id)).size).toBe(24)
    for (let i = 0; i < 12; i++) expect(new Set(drawingGroup(i).map(p => p.id)).size).toBe(4)
  })
  for (const puzzle of TANGRAMS) {
    it(`${puzzle.name}: uses the exact seven pieces without overlap`, () => {
      expect(puzzle.placements.map(p => p.id).sort()).toEqual(PIECES.map(p => p.id).sort())
      const sum = puzzle.placements.reduce((s, p) => s + area(placedRing(p)), 0)
      expect(sum - multiArea(silhouette(puzzle.placements))).toBeLessThan(.00001)
      expect(checkAssembly(puzzle, puzzle.placements).ok).toBe(true)
      const swapped = puzzle.placements.map(p => ({ ...p, id: p.id === 'semi-a' ? 'semi-b' as const : p.id === 'semi-b' ? 'semi-a' as const : p.id }))
      expect(checkAssembly(puzzle, swapped).ok).toBe(true)
    })
    it(`${puzzle.name}: accepts its true seams and rejects incomplete cuts`, () => {
      const answer = seams(puzzle), result = checkDrawing(puzzle, answer)
      expect(result, `${puzzle.name}: ${result.message}`).toMatchObject({ ok: true })
      expect(checkDrawing(puzzle, []).ok).toBe(false)
    })
  }
})
