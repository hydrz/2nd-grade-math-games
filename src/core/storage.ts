import type {
  CompetitionSession,
  Draft,
  GameKind,
  SaveData,
  Score,
  ExamType,
} from './types';
// Level totals for validation; the catalogs themselves live in tangrams.ts / matches.ts.
const DRAW_LEVELS = 24,
  ASSEMBLE_LEVELS = 24,
  MATCH_LEVELS = 60;
export const STORAGE_KEY = 'little-hero-math:v1';
export const emptyDraft = (): Draft => ({
  errors: 0,
  hints: 0,
  revealed: false,
});
export const freshSave = (): SaveData => ({
  version: 2,
  nickname: '小勇士',
  stars: {},
  drafts: {},
  mistakes: [],
  scores: [],
  competition: null,
  certificates: [],
  settings: { sound: true },
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const validPoint = (v: unknown) =>
  Array.isArray(v) && v.length === 2 && v.every(finite);
export function validDraft(value: unknown): value is Draft {
  if (
    !record(value) ||
    !finite(value.errors) ||
    !finite(value.hints) ||
    typeof value.revealed !== 'boolean'
  )
    return false;
  if (
    value.matches !== undefined &&
    (!Array.isArray(value.matches) ||
      value.matches.length !== 7 ||
      !value.matches.every(
        (n, i) => Number.isInteger(n) && n >= 0 && n <= (i === 2 ? 3 : 127),
      ))
  )
    return false;
  if (
    value.strokes !== undefined &&
    (!Array.isArray(value.strokes) ||
      value.strokes.length > 4 ||
      !value.strokes.every(
        (s) =>
          Array.isArray(s) &&
          s.length <= 500 &&
          s.every(
            (v) =>
              record(v) &&
              ['line', 'arc'].includes(String(v.kind)) &&
              validPoint(v.a) &&
              validPoint(v.b) &&
              (v.side === undefined || v.side === 1 || v.side === -1),
          ),
      ))
  )
    return false;
  const piece = (p: unknown) =>
    record(p) &&
    [
      'circle',
      'semi-a',
      'semi-b',
      'triangle',
      'trapezoid',
      'center',
      'large',
    ].includes(String(p.id)) &&
    finite(p.x) &&
    finite(p.y) &&
    finite(p.angle) &&
    typeof p.flipped === 'boolean';
  if (
    value.placements !== undefined &&
    (!Array.isArray(value.placements) ||
      value.placements.length !== 7 ||
      !value.placements.every(piece) ||
      new Set(value.placements.map((p) => (p as { id: string }).id)).size !== 7)
  )
    return false;
  if (
    value.guides !== undefined &&
    (!Array.isArray(value.guides) ||
      value.guides.length > 4 ||
      !value.guides.every(
        (g) =>
          Array.isArray(g) &&
          (g.length === 0 || (g.length === 7 && g.every(piece))),
      ))
  )
    return false;
  return true;
}
export function parseSave(raw: string): SaveData {
  const value: unknown = JSON.parse(raw);
  if (
    !record(value) ||
    (value.version !== 1 && value.version !== 2) ||
    typeof value.nickname !== 'string' ||
    value.nickname.length > 20 ||
    !record(value.stars) ||
    !Object.values(value.stars).every(
      (n) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 3,
    ) ||
    !record(value.drafts) ||
    !Object.values(value.drafts).every(validDraft) ||
    !Array.isArray(value.mistakes) ||
    !Array.isArray(value.scores) ||
    !Array.isArray(value.certificates) ||
    !value.certificates.every((s) => typeof s === 'string')
  )
    throw new Error('这份存档格式不正确，请选择由本应用导出的 JSON 文件。');
  if (
    !value.mistakes.every(
      (v) =>
        record(v) &&
        typeof v.id === 'string' &&
        ['draw', 'assemble', 'match'].includes(String(v.kind)) &&
        typeof v.puzzleId === 'string' &&
        typeof v.reason === 'string' &&
        finite(v.date) &&
        finite(v.streak) &&
        finite(v.reviews),
    )
  )
    throw new Error('错题记录不完整，未导入。');
  if (
    !value.scores.every(
      (v) =>
        record(v) &&
        typeof v.id === 'string' &&
        ['mixed', 'draw', 'assemble', 'match'].includes(String(v.type)) &&
        finite(v.score) &&
        v.score >= 0 &&
        v.score <= 100 &&
        finite(v.seconds) &&
        finite(v.date),
    )
  )
    throw new Error('成绩记录不完整，未导入。');
  if (value.competition !== null) {
    const c = value.competition;
    if (
      !record(c) ||
      typeof c.id !== 'string' ||
      !['mixed', 'draw', 'assemble', 'match'].includes(String(c.type)) ||
      !finite(c.startedAt) ||
      !finite(c.deadline) ||
      c.deadline < c.startedAt ||
      !Array.isArray(c.tasks) ||
      c.tasks.length > 12 ||
      !c.tasks.length ||
      !c.tasks.every(
        (t) =>
          record(t) &&
          ['draw', 'assemble', 'match'].includes(String(t.kind)) &&
          Number.isInteger(t.index) &&
          Number(t.index) >= 0 &&
          Number(t.index) <
            (t.kind === 'draw'
              ? DRAW_LEVELS
              : t.kind === 'assemble'
                ? ASSEMBLE_LEVELS
                : MATCH_LEVELS) &&
          validDraft(t.draft),
      ) ||
      !Number.isInteger(c.current) ||
      Number(c.current) < 0 ||
      Number(c.current) >= c.tasks.length
    )
      throw new Error('比赛记录不完整，未导入。');
  }
  // Version 1 shipped a sound flag that had no UI; treat those saves as sound-on.
  const sound =
    value.version === 1
      ? true
      : record(value.settings) && typeof value.settings.sound === 'boolean'
        ? value.settings.sound
        : true;
  return {
    ...freshSave(),
    ...value,
    version: 2,
    settings: { sound },
  } as SaveData;
}
export function loadSave(): { data: SaveData; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? parseSave(raw) : freshSave(), warning: '' };
  } catch {
    return {
      data: freshSave(),
      warning:
        '原存档暂时无法读取，已保留原数据。你可以导出原存档备份，再选择重置。',
    };
  }
}
export function persistSave(data: SaveData): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return '';
  } catch {
    return '自动保存失败，浏览器存储空间可能不足。请导出存档备份，当前练习仍可继续。';
  }
}
export const starsFor = (d: Draft) =>
  d.revealed
    ? 0
    : d.hints === 0 && d.errors === 0
      ? 3
      : d.hints <= 1 && d.errors <= 2
        ? 2
        : 1;
export const levelKey = (kind: GameKind, index: number) => `${kind}:${index}`;
export const examLabel: Record<ExamType, string> = {
  mixed: '综合挑战',
  draw: '分解专项',
  assemble: '组装专项',
  match: '火柴专项',
};
export function makeCompetition(
  type: ExamType,
  now = Date.now(),
): CompetitionSession {
  const seed = Math.floor(now / 1000),
    task = (kind: GameKind, i: number) => ({
      kind,
      index:
        (seed + i * 7) %
        (kind === 'draw'
          ? DRAW_LEVELS
          : kind === 'assemble'
            ? ASSEMBLE_LEVELS
            : MATCH_LEVELS),
      draft: emptyDraft(),
    });
  const tasks =
    type === 'mixed'
      ? [
          ...Array.from({ length: 6 }, (_, i) => task('draw', i)),
          ...Array.from({ length: 4 }, (_, i) => task('match', i)),
        ]
      : Array.from(
          { length: type === 'draw' ? 6 : type === 'assemble' ? 6 : 10 },
          (_, i) => task(type, i),
        );
  return {
    id: `exam-${now}`,
    type,
    startedAt: now,
    deadline: now + 15 * 60 * 1000,
    tasks,
    current: 0,
  };
}
export function settleCompetition(
  data: SaveData,
  score: number,
  now = Date.now(),
): SaveData {
  const session = data.competition;
  if (!session) return data;
  const item: Score = {
    id: session.id,
    type: session.type,
    score,
    seconds: Math.min(
      900,
      Math.max(0, Math.floor((now - session.startedAt) / 1000)),
    ),
    date: now,
  };
  return {
    ...data,
    competition: null,
    scores: data.scores.some((s) => s.id === item.id)
      ? data.scores
      : [...data.scores, item],
    certificates:
      item.type === 'mixed' &&
      score >= 80 &&
      !data.certificates.includes(item.id)
        ? [...data.certificates, item.id]
        : data.certificates,
  };
}
export function downloadText(
  text: string,
  name: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
