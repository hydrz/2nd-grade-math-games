import { describe, expect, it } from 'vitest'
import { buildPath, parseRoute } from './routes'

describe('routes', () => {
  it('parses home routes', () => {
    expect(parseRoute('/')).toEqual({ page: 'home', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/home')).toEqual({ page: 'home', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('')).toEqual({ page: 'home', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('#/')).toEqual({ page: 'home', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
  })

  it('parses game routes with 1-based level numbers', () => {
    expect(parseRoute('/draw/1')).toEqual({ page: 'draw', levelIndex: 0, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/draw/12')).toEqual({ page: 'draw', levelIndex: 11, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/assemble/5')).toEqual({ page: 'assemble', levelIndex: 4, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/match/10', '?op=remove')).toEqual({ page: 'match', levelIndex: 9, growthTab: 'medals', operation: 'remove' })
  })

  it('handles game route without level', () => {
    expect(parseRoute('/draw')).toEqual({ page: 'draw', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
  })

  it('parses contest route', () => {
    expect(parseRoute('/contest')).toEqual({ page: 'contest', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
  })

  it('parses growth tabs', () => {
    expect(parseRoute('/growth')).toEqual({ page: 'growth', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/growth/medals')).toEqual({ page: 'growth', levelIndex: undefined, growthTab: 'medals', operation: 'all' })
    expect(parseRoute('/growth/mistakes')).toEqual({ page: 'growth', levelIndex: undefined, growthTab: 'mistakes', operation: 'all' })
    expect(parseRoute('/growth/scores')).toEqual({ page: 'growth', levelIndex: undefined, growthTab: 'scores', operation: 'all' })
  })

  it('builds path correctly', () => {
    expect(buildPath('home')).toBe('/')
    expect(buildPath('contest')).toBe('/contest')
    expect(buildPath('growth')).toBe('/growth')
    expect(buildPath('growth', undefined, 'scores')).toBe('/growth/scores')
    expect(buildPath('growth', undefined, 'mistakes')).toBe('/growth/mistakes')
    expect(buildPath('draw', 0)).toBe('/draw/1')
    expect(buildPath('assemble', 5)).toBe('/assemble/6')
    expect(buildPath('match', 2, undefined, 'add')).toBe('/match/3?op=add')
    expect(buildPath('match', 2, undefined, 'all')).toBe('/match/3')
  })
})
