import { describe, expect, it } from 'vitest'
import { PIECES, area, checkAssembly, checkDrawing, silhouette } from './geometry'
import { MATCHES, checkMatch, parseEquation, solveMatch } from './matches'
import type { TangramPuzzle } from './types'

const separated: TangramPuzzle = {
  id: 'test',
  name: '七块板',
  source: 'original',
  placements: PIECES.map((p, i) => ({ id: p.id, x: i * 4, y: 0, angle: 0, flipped: false })),
}
describe('standard modern tangram', () => {
  it('has seven fixed pieces and correct shared circle diameter', () => {
    expect(PIECES).toHaveLength(7)
    expect(area(PIECES[0].ring)).toBeCloseTo(Math.PI / 4, 3)
    expect(area(PIECES[1].ring)).toBeCloseTo(Math.PI / 8, 3)
    expect(area(PIECES[2].ring)).toBe(area(PIECES[1].ring))
    expect(area(PIECES[5].ring)).toBeCloseTo(Math.SQRT2 + 0.5, 5)
    expect(area(PIECES[6].ring)).toBeCloseTo(2 * Math.SQRT2 - 0.5 - Math.PI / 8, 3)
  })
  it('checks actual coverage and overlap', () => {
    expect(checkAssembly(separated, separated.placements).ok).toBe(true)
    expect(
      checkAssembly(
        separated,
        separated.placements.map((p) => (p.id === 'circle' ? { ...p, x: 4 } : p)),
      ).ok,
    ).toBe(false)
    expect(checkAssembly(separated, separated.placements.slice(1)).ok).toBe(false)
  })
  it('recognizes disconnected regions without needing extra lines', () => {
    expect(silhouette(separated.placements)).toHaveLength(7)
    expect(checkDrawing(separated, []).ok).toBe(true)
    expect(checkDrawing(separated, [{ kind: 'line', a: [-0.5, 0], b: [0.5, 0] }]).ok).toBe(false)
    expect(
      checkDrawing(separated, [
        { kind: 'line', a: [0, 10], b: [1, 10] },
        { kind: 'line', a: [1, 10], b: [0, 11] },
        { kind: 'line', a: [0, 11], b: [0, 10] },
      ]).ok,
    ).toBe(false)
  })
  it('accepts an alternative valid split rather than comparing stored answer lines', () => {
    const puzzle = {
      ...separated,
      placements: separated.placements.map((p) =>
        p.id === 'semi-a' ? { ...p, x: 4 } : p.id === 'semi-b' ? { ...p, x: 4, angle: 180 } : p,
      ),
    }
    expect(checkDrawing(puzzle, [{ kind: 'line', a: [3.5, 0], b: [4.5, 0] }]).ok).toBe(true)
    expect(checkDrawing(puzzle, [{ kind: 'line', a: [4, -0.5], b: [4, 0.5] }]).ok).toBe(true)
  })
  it('requires the curved seam separating the circle from the large piece', () => {
    const puzzle = {
      ...separated,
      placements: separated.placements.map((p) =>
        p.id === 'circle'
          ? { ...p, x: 0, y: 0.5 }
          : p.id === 'large'
            ? { ...p, x: 0 }
            : { ...p, y: 4 },
      ),
    }
    expect(checkDrawing(puzzle, [{ kind: 'arc', a: [0, 0], b: [0, 1], side: 1 }]).ok).toBe(true)
    expect(checkDrawing(puzzle, [{ kind: 'line', a: [0, 0], b: [0, 1] }]).ok).toBe(false)
  })
})
describe('matchstick bank', () => {
  it('contains 20 solvable questions per operation and both operation counts', () => {
    expect(MATCHES).toHaveLength(60)
    for (const operation of ['remove', 'add', 'move']) {
      const questions = MATCHES.filter((p) => p.operation === operation)
      expect(questions).toHaveLength(20)
      expect(new Set(questions.map((p) => p.count)).size).toBe(2)
    }
    for (const puzzle of MATCHES) {
      expect(parseEquation(puzzle.initial).valid).toBe(false)
      expect(puzzle.solutions.length).toBeGreaterThan(0)
      for (const solution of puzzle.solutions) expect(checkMatch(puzzle, solution).ok).toBe(true)
      expect(checkMatch(puzzle, puzzle.initial).ok).toBe(false)
    }
  })
  it('retains the reference question and accepts alternatives', () => {
    const reference = MATCHES[0]
    expect(parseEquation(reference.initial).text).toBe('39 + 11 = 58')
    expect(reference.solutions.some((s) => parseEquation(s).text === '39 + 11 = 50')).toBe(true)
    expect(solveMatch(reference.initial, 'remove', 1).length).toBeGreaterThan(0)
  })
})
