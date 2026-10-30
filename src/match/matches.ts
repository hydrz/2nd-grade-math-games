import type { CheckResult, MatchOperation, MatchPuzzle } from '../core/types';

// a,b,c,d,e,f,g = top, upper-right, lower-right, bottom, lower-left, upper-left, middle.
export const DIGITS = [
  0b0111111, 0b0000110, 0b1011011, 0b1001111, 0b1100110, 0b1101101, 0b1111101,
  0b0000111, 0b1111111, 0b1101111,
];
export const MINUS = 1,
  PLUS = 3;
export const operationLabel: Record<MatchOperation, string> = {
  remove: '拿走',
  add: '添加',
  move: '移动',
};
export const bits = (n: number) => {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
};
export function parseEquation(state: number[]): {
  valid: boolean;
  text: string;
} {
  if (state.length !== 7) return { valid: false, text: '算式不完整' };
  const values = state.map((mask, i) =>
    i === 2
      ? mask === PLUS
        ? '+'
        : mask === MINUS
          ? '−'
          : '?'
      : DIGITS.indexOf(mask),
  );
  if (values.some((v) => v === -1 || v === '?'))
    return { valid: false, text: '有一个数字或符号还没摆完整' };
  const [a, b, op, c, d, e, f] = values;
  const left = Number(a) * 10 + Number(b),
    right = Number(c) * 10 + Number(d),
    result = Number(e) * 10 + Number(f);
  const text = `${left} ${op} ${right} = ${result}`;
  // Leading zero is shown only as an empty leading position in authored two-digit equations.
  const valid = (op === '+' ? left + right : left - right) === result;
  return { valid, text };
}
export function changeCounts(initial: number[], current: number[]) {
  return initial.reduce(
    (r, mask, i) => ({
      removed: r.removed + bits(mask & ~current[i]),
      added: r.added + bits(current[i] & ~mask),
    }),
    { removed: 0, added: 0 },
  );
}
export function checkMatch(puzzle: MatchPuzzle, state: number[]): CheckResult {
  if (
    state.length !== 7 ||
    state.some(
      (m, i) => !Number.isInteger(m) || m < 0 || m > (i === 2 ? 3 : 127),
    )
  )
    return { ok: false, message: '火柴位置不完整，请重置后再试。' };
  const { removed, added } = changeCounts(puzzle.initial, state);
  const validCount =
    puzzle.operation === 'remove'
      ? removed === puzzle.count && added === 0
      : puzzle.operation === 'add'
        ? added === puzzle.count && removed === 0
        : removed === puzzle.count && added === puzzle.count;
  if (!validCount)
    return {
      ok: false,
      message: `这一题要${operationLabel[puzzle.operation]}${puzzle.count}根火柴；现在拿走${removed}根、添加${added}根。`,
    };
  const parsed = parseEquation(state);
  return parsed.valid
    ? { ok: true, message: `${parsed.text}，等式成立！你找到了好办法。` }
    : {
        ok: false,
        message: parsed.text.includes('完整')
          ? parsed.text
          : `${parsed.text}，两边还不相等，再想一想。`,
      };
}
const numberMasks = (n: number) => [DIGITS[Math.floor(n / 10)], DIGITS[n % 10]];
function initialFrom(a: number, b: number, plus: boolean, c: number) {
  return [
    ...numberMasks(a),
    plus ? PLUS : MINUS,
    ...numberMasks(b),
    ...numberMasks(c),
  ];
}
export function solveMatch(
  initial: number[],
  operation: MatchOperation,
  count: number,
): number[][] {
  const choices = initial.map((old, i) =>
    (i === 2 ? [MINUS, PLUS] : DIGITS)
      .map((mask) => ({
        mask,
        removed: bits(old & ~mask),
        added: bits(mask & ~old),
      }))
      .filter((c) =>
        operation === 'add'
          ? !c.removed && c.added <= count
          : operation === 'remove'
            ? !c.added && c.removed <= count
            : c.removed <= count && c.added <= count,
      ),
  );
  const results: number[][] = [],
    requiredRemove = operation === 'add' ? 0 : count,
    requiredAdd = operation === 'remove' ? 0 : count;
  function walk(i: number, removed: number, added: number, state: number[]) {
    if (removed > requiredRemove || added > requiredAdd) return;
    if (i === 7) {
      if (
        removed === requiredRemove &&
        added === requiredAdd &&
        parseEquation(state).valid
      )
        results.push(state);
      return;
    }
    for (const c of choices[i])
      walk(i + 1, removed + c.removed, added + c.added, [...state, c.mask]);
  }
  walk(0, 0, 0, []);
  return results;
}
export function makeMatchBank(): MatchPuzzle[] {
  const bank: MatchPuzzle[] = [],
    seen = new Set<string>();
  const append = (
    initial: number[],
    operation: MatchOperation,
    count: number,
  ) => {
    const key = `${operation}:${initial.join(',')}`;
    if (seen.has(key) || parseEquation(initial).valid) return false;
    const solutions = solveMatch(initial, operation, count);
    if (!solutions.length) return false;
    seen.add(key);
    bank.push({
      id: `match-${operation}-${bank.filter((p) => p.operation === operation).length + 1}`,
      operation,
      count,
      initial,
      solutions,
    });
    return true;
  };
  append(initialFrom(39, 11, true, 58), 'remove', 1);
  // Reverse valid equations into invalid but well-formed starting equations.
  for (const operation of ['remove', 'add', 'move'] as const) {
    for (const count of [1, 2]) {
      let made = operation === 'remove' && count === 1 ? 1 : 0;
      outer: for (let seed = 0; seed < 20000; seed++) {
        const a = 10 + ((seed * 17 + 13) % 79),
          b = 10 + ((seed * 31 + Math.floor(seed / 79)) % 79),
          plus = seed % 3 !== 0;
        const c = plus ? a + b : a - b;
        if (c < 10 || c > 99) continue;
        const correct = initialFrom(a, b, plus, c);
        const options = correct.map((mask, i) =>
          (i === 2 ? [MINUS, PLUS] : DIGITS)
            .filter((m) => m !== mask)
            .map((m) => ({
              i,
              m,
              removed: bits(mask & ~m),
              added: bits(m & ~mask),
            })),
        );
        const changes = options.flat();
        for (let i = 0; i < changes.length; i++)
          for (let j = -1; j < changes.length; j++) {
            if (j >= 0 && (j <= i || changes[i].i === changes[j].i)) continue;
            const selected = j < 0 ? [changes[i]] : [changes[i], changes[j]];
            const removed = selected.reduce((s, x) => s + x.removed, 0),
              added = selected.reduce((s, x) => s + x.added, 0);
            const reverseFits =
              operation === 'remove'
                ? removed === 0 && added === count
                : operation === 'add'
                  ? added === 0 && removed === count
                  : removed === count && added === count;
            if (!reverseFits) continue;
            const initial = [...correct];
            selected.forEach((x) => {
              initial[x.i] = x.m;
            });
            if (append(initial, operation, count) && ++made >= 10) break outer;
          }
      }
    }
  }
  return bank;
}
export const MATCHES = makeMatchBank();
