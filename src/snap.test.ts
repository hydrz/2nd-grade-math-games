import { describe, expect, it } from 'vitest'
import { checkAssembly, silhouette, snapPlacement } from './geometry'
import { TANGRAMS } from './tangrams'
import type { Placement } from './types'

const near = (p: Placement): Placement => ({ ...p, x: p.x + 0.22, y: p.y - 0.18 })

describe('assembly snapping', () => {
  it('locks each piece onto its answer slot when released nearby', () => {
    for (const puzzle of TANGRAMS) {
      const boundary = silhouette(puzzle.placements)
      for (const slot of puzzle.placements) {
        const snapped = snapPlacement(near(slot), [], boundary, [slot], 0.2, 0.4)
        expect([snapped.x, snapped.y]).toEqual([slot.x, slot.y])
      }
    }
  })
  it('lets the two semicircles take the other matching slot', () => {
    const puzzle = TANGRAMS[0]
    const a = puzzle.placements.find((p) => p.id === 'semi-a')!,
      b = puzzle.placements.find((p) => p.id === 'semi-b')!
    const swapped = snapPlacement(
      { ...b, x: b.x + 0.15, y: b.y + 0.12 },
      [],
      silhouette(puzzle.placements),
      [b],
      0.2,
      0.4,
    )
    expect([swapped.x, swapped.y]).toEqual([b.x, b.y])
    expect(a.id).not.toBe(b.id)
  })
  it('does not rotate a wrongly turned piece into a slot', () => {
    const puzzle = TANGRAMS[0]
    for (const slot of puzzle.placements) {
      if (slot.id === 'circle') continue
      const turned = { ...near(slot), angle: slot.angle + 45 }
      const snapped = snapPlacement(turned, [], [], [slot], 0.2, 0.4)
      expect([snapped.x, snapped.y, snapped.angle]).toEqual([turned.x, turned.y, turned.angle])
    }
  })
  it('leaves a piece alone when it is far from every slot', () => {
    const slot = TANGRAMS[0].placements[0],
      p = { ...slot, x: slot.x + 2, y: slot.y + 2 }
    expect(snapPlacement(p, [], [], [slot], 0.2, 0.4)).toEqual(p)
  })
  it('aligns several anchors at once instead of chasing one stray vertex', () => {
    const large: Placement = { id: 'large', x: 0, y: 0, angle: 0, flipped: false }
    const triangle: Placement = { id: 'triangle', x: 0.08, y: -0.06, angle: 0, flipped: false }
    const snapped = snapPlacement(triangle, [large], [], [], 0.2, 0.4)
    expect(snapped.x).toBeCloseTo(0, 7)
    expect(snapped.y).toBeCloseTo(0, 7)
  })
  it('accepts a full slot-snapped assembly', () => {
    for (const puzzle of TANGRAMS) {
      const boundary = silhouette(puzzle.placements)
      const placements = puzzle.placements.map((slot) =>
        snapPlacement(near(slot), [], boundary, [slot], 0.2, 0.4),
      )
      expect(checkAssembly(puzzle, placements).ok).toBe(true)
    }
  })
})

describe('assembly checking', () => {
  it('accepts hand-placed pieces with hairline seams', () => {
    const puzzle = TANGRAMS[0]
    const nudged = puzzle.placements.map((p, i) => ({
      ...p,
      x: p.x + (i % 2 ? 0.012 : -0.012),
      y: p.y + (i % 3 ? 0.01 : -0.01),
    }))
    expect(checkAssembly(puzzle, nudged).ok).toBe(true)
  })
  it('still rejects visibly misplaced pieces', () => {
    const puzzle = TANGRAMS[0]
    const wrong = puzzle.placements.map((p) => (p.id === 'circle' ? { ...p, x: p.x + 0.2 } : p))
    expect(checkAssembly(puzzle, wrong).ok).toBe(false)
  })
})
