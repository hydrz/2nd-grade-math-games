import type { GameKind } from './types'

export type Page = 'home' | GameKind | 'contest' | 'growth'
export type GrowthTab = 'medals' | 'mistakes' | 'scores'
export type MatchOperation = 'all' | 'remove' | 'add' | 'move'

export interface RouteState {
  page: Page
  levelIndex?: number
  growthTab: GrowthTab
  operation: MatchOperation
}

export function parseRoute(pathname: string, search = ''): RouteState {
  const clean = pathname.replace(/^#?\/*/, '').split('/')
  const section = clean[0] || 'home'
  const searchParams = new URLSearchParams(search)
  const opParam = searchParams.get('op')
  const op: MatchOperation =
    opParam === 'remove' || opParam === 'add' || opParam === 'move' ? opParam : 'all'

  if (section === 'draw' || section === 'assemble' || section === 'match') {
    const rawLevel = clean[1] ? parseInt(clean[1], 10) - 1 : undefined
    return {
      // Old /assemble deep links land in the draw studio, which embeds free assembly.
      page: section === 'assemble' ? 'draw' : (section as GameKind),
      levelIndex: rawLevel !== undefined && !Number.isNaN(rawLevel) ? rawLevel : undefined,
      growthTab: 'medals',
      operation: op,
    }
  }

  if (section === 'contest') {
    return {
      page: 'contest',
      levelIndex: undefined,
      growthTab: 'medals',
      operation: op,
    }
  }

  if (section === 'growth') {
    const tabParam = clean[1] || searchParams.get('tab')
    const tab: GrowthTab = tabParam === 'mistakes' || tabParam === 'scores' ? tabParam : 'medals'
    return {
      page: 'growth',
      levelIndex: undefined,
      growthTab: tab,
      operation: op,
    }
  }

  return {
    page: 'home',
    levelIndex: undefined,
    growthTab: 'medals',
    operation: op,
  }
}

export function buildPath(
  page: Page,
  levelIndex?: number,
  tab?: GrowthTab,
  operation?: MatchOperation,
): string {
  if (page === 'home') return '/'
  if (page === 'contest') return '/contest'
  if (page === 'growth') {
    return tab && tab !== 'medals' ? `/growth/${tab}` : '/growth'
  }
  if (page === 'draw' || page === 'match') {
    const levelPart = levelIndex !== undefined ? `/${levelIndex + 1}` : ''
    const search = page === 'match' && operation && operation !== 'all' ? `?op=${operation}` : ''
    return `/${page}${levelPart}${search}`
  }
  return '/'
}
