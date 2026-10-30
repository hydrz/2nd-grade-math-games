import type { MultiPolygon } from 'polygon-clipping'
export type Point = [number, number]
export type PieceId = 'circle' | 'semi-a' | 'semi-b' | 'triangle' | 'trapezoid' | 'center' | 'large'
export type GameKind = 'draw' | 'assemble' | 'match'
export interface PieceDefinition {
  id: PieceId
  name: string
  color: string
  ring: Point[]
  anchors: Point[]
}
export interface Placement {
  id: PieceId
  x: number
  y: number
  angle: number
  flipped: boolean
}
export interface TangramPuzzle {
  id: string
  name: string
  source: 'reference' | 'original'
  placements: Placement[]
}
export interface Stroke {
  kind: 'line' | 'arc'
  a: Point
  b: Point
  side?: number
}
export interface TangramDraft {
  strokes: Stroke[]
  placements: Placement[]
}
export type MatchOperation = 'remove' | 'add' | 'move'
export interface MatchPuzzle {
  id: string
  operation: MatchOperation
  count: number
  initial: number[]
  solutions: number[][]
}
export interface Attempt {
  id: string
  kind: GameKind
  puzzleId: string
  reason: string
  snapshot: unknown
  date: number
  streak: number
  reviews: number
}
export interface Draft {
  strokes?: Stroke[][]
  placements?: Placement[]
  matches?: number[]
  guides?: Placement[][]
  errors: number
  hints: number
  revealed: boolean
  completed?: boolean
}
export type ExamType = 'mixed' | GameKind
export interface ExamTask {
  kind: GameKind
  index: number
  draft: Draft
}
export interface CompetitionSession {
  id: string
  type: ExamType
  startedAt: number
  deadline: number
  tasks: ExamTask[]
  current: number
}
export interface Score {
  id: string
  type: ExamType
  score: number
  seconds: number
  date: number
}
export interface SaveData {
  version: 1
  nickname: string
  stars: Record<string, number>
  drafts: Record<string, Draft>
  mistakes: Attempt[]
  scores: Score[]
  competition: CompetitionSession | null
  certificates: string[]
  settings: { sound: boolean }
}
export interface CheckResult {
  ok: boolean
  message: string
  regions?: MultiPolygon
  strokeIndex?: number
}
