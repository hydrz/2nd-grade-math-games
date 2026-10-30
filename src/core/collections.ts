/**
 * Non-mutating sort. `toSorted()` is ES2023 while the project targets an ES2020 runtime.
 */
export function sorted<T>(
  values: Iterable<T>,
  compare?: (a: T, b: T) => number,
): T[] {
  return [...values].sort(compare);
}
