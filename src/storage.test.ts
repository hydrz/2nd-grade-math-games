import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  emptyDraft,
  freshSave,
  loadSave,
  makeCompetition,
  parseSave,
  persistSave,
  settleCompetition,
  starsFor,
  STORAGE_KEY,
} from './storage'
afterEach(() => vi.unstubAllGlobals())
describe('versioned local progress', () => {
  it('round trips progress, drafts and active competition', () => {
    const data = freshSave()
    data.stars['draw:0'] = 3
    data.drafts['match:0'] = { ...emptyDraft(), matches: [79, 111, 3, 6, 6, 109, 127] }
    data.competition = makeCompetition('mixed', 1000)
    expect(parseSave(JSON.stringify(data))).toEqual(data)
  })
  it('rejects unsupported versions and malformed nested drafts without overwriting them', () => {
    expect(() => parseSave(JSON.stringify({ ...freshSave(), version: 8 }))).toThrow()
    expect(() =>
      parseSave(
        JSON.stringify({
          ...freshSave(),
          drafts: {
            'draw:0': { ...emptyDraft(), strokes: [[{ kind: 'line', a: [NaN, 0], b: [1, 1] }]] },
          },
        }),
      ),
    ).toThrow()
    const storage = { getItem: vi.fn(() => '{broken'), setItem: vi.fn() }
    vi.stubGlobal('localStorage', storage)
    expect(loadSave().warning).toBeTruthy()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('surfaces quota failures and preserves the existing save', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota')
      }),
    }
    vi.stubGlobal('localStorage', storage)
    expect(persistSave(freshSave())).toContain('自动保存失败')
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))
  })
  it('keeps a fixed absolute deadline and settles at most once', () => {
    const data = { ...freshSave(), competition: makeCompetition('mixed', 1000) }
    expect(data.competition.deadline).toBe(901000)
    const done = settleCompetition(data, 80, 999000)
    expect(done.competition).toBeNull()
    expect(done.scores[0].seconds).toBe(900)
    expect(done.certificates).toHaveLength(1)
    expect(settleCompetition(done, 80, 999001).scores).toHaveLength(1)
    expect(makeCompetition('draw', 1000).tasks).toHaveLength(6)
    expect(makeCompetition('assemble', 1000).tasks).toHaveLength(6)
    expect(makeCompetition('match', 1000).tasks).toHaveLength(10)
  })
  it('awards stars without crediting revealed answers', () => {
    expect(starsFor(emptyDraft())).toBe(3)
    expect(starsFor({ ...emptyDraft(), hints: 1, errors: 2 })).toBe(2)
    expect(starsFor({ ...emptyDraft(), hints: 2 })).toBe(1)
    expect(starsFor({ ...emptyDraft(), revealed: true })).toBe(0)
  })
  it('starts new saves with sound on and migrates the pre-sound archive', () => {
    expect(freshSave().version).toBe(2)
    expect(freshSave().settings.sound).toBe(true)
    const legacy = { ...freshSave(), version: 1, settings: { sound: false } }
    const migrated = parseSave(JSON.stringify(legacy))
    expect(migrated.version).toBe(2)
    expect(migrated.settings.sound).toBe(true)
    const muted = { ...freshSave(), settings: { sound: false } }
    expect(parseSave(JSON.stringify(muted)).settings.sound).toBe(false)
  })
})
