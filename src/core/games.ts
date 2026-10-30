import { Pencil, Shapes, Flame } from 'lucide-react';
import {
  PIECES,
  bounds,
  checkAssembly,
  checkDrawing,
  silhouette,
} from '../tangram/geometry';
import { MATCHES, checkMatch } from '../match/matches';
import { TANGRAMS } from '../tangram/tangrams';
import type {
  CheckResult,
  Draft,
  GameKind,
  Placement,
  Point,
  TangramPuzzle,
} from './types';
export const kindLabel = {
  draw: '七巧板分解',
  assemble: '七巧板组装',
  match: '火柴棒挑战',
};
export const kindIcon = { draw: Pencil, assemble: Shapes, match: Flame };
export function scatter(puzzle: TangramPuzzle): Placement[] {
  const b = bounds(silhouette(puzzle.placements)),
    cx = b.x + b.width / 2;
  const points: Point[] = [
    [b.x - 1, b.y - 1.5],
    [cx, b.y - 1.5],
    [b.x + b.width + 1, b.y - 1.5],
    [b.x - 2.6, b.y + b.height / 2],
    [b.x + b.width + 1, b.y + b.height / 2],
    [b.x - 0.5, b.y + b.height + 1],
    [cx + 0.5, b.y + b.height + 1],
  ];
  return PIECES.map((p, i) => ({
    id: p.id,
    x: points[i][0],
    y: points[i][1],
    angle: [0, 90, 180, 45, 0, 180, 0][i],
    flipped: false,
  }));
}
export function checkGame(
  kind: GameKind,
  index: number,
  draft: Draft,
): CheckResult[] {
  if (kind === 'match')
    return [
      checkMatch(MATCHES[index], draft.matches || MATCHES[index].initial),
    ];
  if (kind === 'assemble')
    return [
      checkAssembly(
        TANGRAMS[index],
        draft.placements || scatter(TANGRAMS[index]),
      ),
    ];
  return [checkDrawing(TANGRAMS[index], draft.strokes?.[0] || [])];
}
