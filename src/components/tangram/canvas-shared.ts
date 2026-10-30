import type { PointerEvent } from 'react';
import type { Point } from '../../core/types';

export function localPoint(event: PointerEvent<SVGSVGElement>): Point {
  const svg = event.currentTarget;
  if (!svg) return [0, 0];
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return [0, 0];
  const value = p.matrixTransform(ctm.inverse());
  return [value.x, value.y];
}
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
