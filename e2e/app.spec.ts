import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MATCHES } from '../src/match/matches';
import {
  bounds,
  piece,
  placedRing,
  silhouette,
  transformPoint,
} from '../src/tangram/geometry';
import { freshSave, STORAGE_KEY } from '../src/core/storage';
import type { Point, SaveData, Stroke, TangramPuzzle } from '../src/core/types';

const reference = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../src/data/reference.json', import.meta.url)),
    'utf8',
  ),
) as TangramPuzzle[];

async function seed(page: Page, save: SaveData) {
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    {
      key: STORAGE_KEY,
      data: save,
    },
  );
}
async function saved(page: Page): Promise<SaveData> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
}
function ringCentroid(ring: Point[]): Point {
  let x = 0,
    y = 0,
    weight = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i],
      b = ring[i + 1],
      w = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * w;
    y += (a[1] + b[1]) * w;
    weight += w;
  }
  return [x / (3 * weight), y / (3 * weight)];
}
function arcMiddle(s: Stroke): Point {
  const cx = (s.a[0] + s.b[0]) / 2,
    cy = (s.a[1] + s.b[1]) / 2,
    r = Math.hypot(s.a[0] - s.b[0], s.a[1] - s.b[1]) / 2;
  const angle =
    Math.atan2(s.a[1] - cy, s.a[0] - cx) + (Math.PI / 2) * (s.side || 1);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}
async function gesture(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  touch: boolean,
) {
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [from],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [to],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
  }
}
test('first visit and all five navigation entries render without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /出发吧/ })).toBeVisible();
  for (const name of [
    '七巧板 · 分解',
    '火柴棒挑战',
    '模拟竞赛',
    '成长与荣誉',
    '闯关地图',
  ])
    await page.getByRole('button', { name, exact: true }).click();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('sound toggle persists and game taps reach the audio engine', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const scope = window as Window & { soundStarts?: number };
    scope.soundStarts = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const oscillator = create.call(this);
      const start = oscillator.start.bind(oscillator);
      oscillator.start = (when = 0) => {
        scope.soundStarts = (scope.soundStarts ?? 0) + 1;
        start(when);
      };
      return oscillator;
    };
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: '关闭音效', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '关闭音效', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '开启音效', exact: true }),
  ).toBeVisible();
  expect((await saved(page)).settings.sound).toBe(false);
  await page.getByRole('button', { name: '开启音效', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '关闭音效', exact: true }),
  ).toBeVisible();
  expect((await saved(page)).settings.sound).toBe(true);
  await page.getByRole('button', { name: '火柴棒挑战', exact: true }).click();
  await page.evaluate(() => {
    (window as Window & { soundStarts?: number }).soundStarts = 0;
  });
  await page.locator('[data-cell="6"][data-bit="6"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { soundStarts?: number }).soundStarts ?? 0,
      ),
    )
    .toBeGreaterThan(0);
});
test('reference matchstick solution earns progress, restores it, and only counts one review', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '火柴棒挑战', exact: true }).click();
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  expect((await saved(page)).mistakes).toHaveLength(1);
  await page.locator('[data-cell="6"][data-bit="6"]').click();
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('50');
  expect((await saved(page)).stars['match:0']).toBe(2);
  expect((await saved(page)).mistakes[0].streak).toBe(1);
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  expect((await saved(page)).mistakes[0].streak).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: '火柴棒挑战', exact: true }).click();
  await page.locator('.level-item').first().click();
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  expect((await saved(page)).mistakes[0].streak).toBe(1);
});
test('finishing after viewing the answer still opens the next level without granting stars', async ({
  page,
}) => {
  const data = freshSave();
  data.drafts['match:0'] = { errors: 0, hints: 0, revealed: true };
  await seed(page, data);
  await page.goto('/');
  await page.getByRole('button', { name: '火柴棒挑战', exact: true }).click();
  await page.locator('[data-cell="6"][data-bit="6"]').click();
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.getByRole('button', { name: /下一关/ })).toBeVisible();
  expect((await saved(page)).stars['match:0']).toBeUndefined();
  expect((await saved(page)).drafts['match:0'].completed).toBe(true);
  await page.getByRole('button', { name: /下一关/ }).click();
  await expect(page.getByText('第 02 关')).toBeVisible();
  expect((await saved(page)).stars['match:0']).toBeUndefined();
});
test('adding and moving matches support taps and accept actual legal solutions', async ({
  page,
}) => {
  const data = freshSave();
  for (let i = 0; i < 40; i++) data.stars[`match:${i}`] = 1;
  await seed(page, data);
  await page.goto('/');
  await page.getByRole('button', { name: '火柴棒挑战', exact: true }).click();
  const puzzle = MATCHES[40],
    solution = puzzle.solutions[0],
    from: [number, number][] = [],
    to: [number, number][] = [];
  puzzle.initial.forEach((mask, i) => {
    for (let b = 0; b < (i === 2 ? 2 : 7); b++) {
      if (mask & (1 << b) && !(solution[i] & (1 << b))) from.push([i, b]);
      if (!(mask & (1 << b)) && solution[i] & (1 << b)) to.push([i, b]);
    }
  });
  for (let n = 0; n < from.length; n++) {
    await page
      .locator(`[data-cell="${from[n][0]}"][data-bit="${from[n][1]}"]`)
      .click();
    await expect(page.locator('.match-slot.chosen')).toHaveCount(1);
    await page
      .locator(`[data-cell="${to[n][0]}"][data-bit="${to[n][1]}"]`)
      .click();
  }
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  expect((await saved(page)).stars['match:40']).toBe(3);
  await page.getByLabel('筛选火柴题型').selectOption('add');
  await page.locator('.level-item').first().click();
  const add = MATCHES[20];
  for (let i = 0; i < 7; i++)
    for (let b = 0; b < (i === 2 ? 2 : 7); b++)
      if (!(add.initial[i] & (1 << b)) && add.solutions[0][i] & (1 << b))
        await page.locator(`[data-cell="${i}"][data-bit="${b}"]`).click();
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('完成');
});
test('drawing captures genuine pointer gestures, undo, redo and zoom', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  const drawing = page.locator('.drawing-svg').first();
  await drawing.scrollIntoViewIfNeeded();
  const box = (await drawing.boundingBox())!;
  await gesture(
    page,
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.6 },
    { x: box.x + box.width * 0.54, y: box.y + box.height * 0.75 },
    info.project.name === 'tablet',
  );
  expect((await saved(page)).drafts['draw:0'].strokes![0]).toHaveLength(1);
  await page
    .getByRole('button', { name: '撤销画线', exact: true })
    .first()
    .click();
  expect((await saved(page)).drafts['draw:0'].strokes![0]).toHaveLength(0);
  await page
    .getByRole('button', { name: '重做画线', exact: true })
    .first()
    .click();
  expect((await saved(page)).drafts['draw:0'].strokes![0]).toHaveLength(1);
  await page
    .getByRole('button', { name: '放大天文望远镜', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭放大', exact: true }).click();
  await page.reload();
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  expect((await saved(page)).drafts['draw:0'].strokes![0]).toHaveLength(1);
});
test('arc tool draws the same semicircle from either end', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  const board = page.locator('.draw-board').first(),
    svg = page.locator('.drawing-svg').first();
  await svg.scrollIntoViewIfNeeded();
  await board.getByRole('button', { name: '半圆弧', exact: true }).click();
  const box = bounds(silhouette(reference[0].placements));
  const semi = reference[0].placements.find((p) => p.id === 'semi-b')!;
  const shifted = { ...semi, x: semi.x - box.x, y: semi.y - box.y };
  const chord: [Point, Point] = [
    transformPoint([-0.5, 0], shifted),
    transformPoint([0.5, 0], shifted),
  ];
  const screen = (point: Point) =>
    svg.evaluate((el, p) => {
      const q = (el as SVGSVGElement).createSVGPoint();
      q.x = p[0];
      q.y = p[1];
      const m = q.matrixTransform((el as SVGSVGElement).getScreenCTM()!);
      return { x: m.x, y: m.y };
    }, point);
  const draw = async (from: Point, to: Point) => {
    await gesture(
      page,
      await screen(from),
      await screen(to),
      info.project.name === 'tablet',
    );
    const strokes = (await saved(page)).drafts['draw:0'].strokes![0];
    return strokes[strokes.length - 1];
  };
  const forward = await draw(chord[0], chord[1]);
  await board.getByRole('button', { name: '清空本图', exact: true }).click();
  const backward = await draw(chord[1], chord[0]);
  expect(forward.kind).toBe('arc');
  expect(backward.kind).toBe('arc');
  const [first, second] = [arcMiddle(forward), arcMiddle(backward)];
  expect(Math.hypot(first[0] - second[0], first[1] - second[1])).toBeLessThan(
    0.02,
  );
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.locator('.individual-feedback').first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('tapping two anchors draws a line and an arc in the single-figure studio', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  const board = page.locator('.draw-board').first(),
    svg = page.locator('.drawing-svg').first();
  await svg.scrollIntoViewIfNeeded();
  expect(await page.locator('.assembly-svg').count()).toBe(1);
  await page.mouse.move(
    (await svg.boundingBox())!.x + 120,
    (await svg.boundingBox())!.y + 120,
  );
  const anchors = await svg.evaluate((el) =>
    [...el.querySelectorAll('circle')]
      .filter((c) => c.getAttribute('r') === '.07')
      .map((c) => [+c.getAttribute('cx')!, +c.getAttribute('cy')!]),
  );
  const screen = (point: Point) =>
    svg.evaluate((el, p) => {
      const q = (el as SVGSVGElement).createSVGPoint();
      q.x = p[0];
      q.y = p[1];
      const m = q.matrixTransform((el as SVGSVGElement).getScreenCTM()!);
      return { x: m.x, y: m.y };
    }, point);
  let pair: [Point, Point] | null = null;
  for (let i = 0; i < anchors.length && !pair; i++)
    for (let j = i + 1; j < anchors.length; j++)
      if (
        Math.abs(anchors[i][1] - anchors[j][1]) < 0.01 &&
        Math.abs(anchors[i][0] - anchors[j][0]) > 0.6
      ) {
        pair = [
          [anchors[i][0], anchors[i][1]],
          [anchors[j][0], anchors[j][1]],
        ];
        break;
      }
  expect(pair).not.toBeNull();
  const tap = async (point: Point) => {
    const at = await screen(point);
    if (info.project.name === 'tablet') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [at],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await cdp.detach();
    } else await page.mouse.click(at.x, at.y);
  };
  for (const point of pair!) await tap(point);
  const strokes = (await saved(page)).drafts['draw:0'].strokes![0];
  expect(strokes).toHaveLength(1);
  expect(
    Math.hypot(strokes[0].a[0] - pair![0][0], strokes[0].a[1] - pair![0][1]),
  ).toBeLessThan(0.01);
  expect(
    Math.hypot(strokes[0].b[0] - pair![1][0], strokes[0].b[1] - pair![1][1]),
  ).toBeLessThan(0.01);
  await board.getByRole('button', { name: '半圆弧', exact: true }).click();
  for (const point of pair!) await tap(point);
  const arcs = (await saved(page)).drafts['draw:0'].strokes![0];
  expect(arcs).toHaveLength(2);
  expect(arcs[1].kind).toBe('arc');
  await page.getByRole('button', { name: '检查答案', exact: true }).click();
  await expect(page.locator('.individual-feedback').first()).toBeVisible();
});

test('the draw studio supports piece movement, rotation, reflection and undo', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  const target = page
    .locator('path.movable-piece')
    .filter({ hasText: '曲形大板' });
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await gesture(
    page,
    { x: box.x + box.width * 0.7, y: box.y + box.height * 0.5 },
    { x: box.x + box.width * 0.7 - 25, y: box.y + box.height * 0.5 - 35 },
    info.project.name === 'tablet',
  );
  const before = (await saved(page)).drafts['draw:0'].placements!.find(
    (p) => p.id === 'large',
  )!;
  await page
    .getByRole('button', { name: '顺时针旋转45度', exact: true })
    .click();
  expect(
    (await saved(page)).drafts['draw:0'].placements!.find(
      (p) => p.id === 'large',
    )!.angle,
  ).toBe(before.angle + 45);
  await page.getByRole('button', { name: '翻面', exact: true }).click();
  expect(
    (await saved(page)).drafts['draw:0'].placements!.find(
      (p) => p.id === 'large',
    )!.flipped,
  ).toBe(true);
  await page.getByRole('button', { name: '撤销组装', exact: true }).click();
  expect(
    (await saved(page)).drafts['draw:0'].placements!.find(
      (p) => p.id === 'large',
    )!.flipped,
  ).toBe(false);
});
test('assembly snaps loosely dragged pieces onto their answer slots and verifies', async ({
  page,
}, info) => {
  const source = reference[0],
    origin = bounds(silhouette(source.placements));
  const slots = source.placements.map((p) => ({
    ...p,
    x: p.x - origin.x,
    y: p.y - origin.y,
  }));
  const b = bounds(silhouette(slots)),
    view = { x: b.x - 2.9, y: b.y - 2.45, w: b.width + 5.8, h: b.height + 4.9 };
  const data = freshSave();
  data.drafts['draw:0'] = {
    errors: 0,
    hints: 0,
    revealed: false,
    placements: slots.map((p) => ({ ...p, x: p.x + 0.45, y: p.y + 0.45 })),
  };
  await seed(page, data);
  await page.goto('/');
  await page
    .getByRole('button', { name: '七巧板 · 分解', exact: true })
    .click();
  const svg = page.locator('.assembly-svg');
  await svg.scrollIntoViewIfNeeded();
  for (const slot of slots) {
    await page
      .getByRole('button', { name: piece(slot.id).name, exact: true })
      .click();
    const box = (await svg.boundingBox())!;
    const scale = Math.min(box.width / view.w, box.height / view.h);
    const screen = (p: Point) => ({
      x: box.x + (box.width - view.w * scale) / 2 + (p[0] - view.x) * scale,
      y: box.y + (box.height - view.h * scale) / 2 + (p[1] - view.y) * scale,
    });
    const raw = { ...slot, x: slot.x + 0.45, y: slot.y + 0.45 },
      landing = screen(ringCentroid(placedRing(slot)));
    await gesture(
      page,
      screen(ringCentroid(placedRing(raw))),
      { x: landing.x + 11, y: landing.y + 9 },
      info.project.name === 'tablet',
    );
    const placed = (await saved(page)).drafts['draw:0'].placements!.find(
      (p) => p.id === slot.id,
    )!;
    expect(placed.x).toBeCloseTo(slot.x, 6);
    expect(placed.y).toBeCloseTo(slot.y, 6);
    expect(placed.angle).toBe(slot.angle);
    expect(placed.flipped).toBe(slot.flipped);
  }
  await page.getByRole('button', { name: '检查拼法', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('严丝合缝');
});
test('competition survives navigation and expires once using the absolute deadline', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '模拟竞赛', exact: true }).click();
  await page.getByRole('button', { name: /综合挑战.*开始挑战/ }).click();
  await expect(
    page.getByRole('button', { name: '给我提示', exact: true }),
  ).toHaveCount(0);
  const start = (await saved(page)).competition!;
  expect(start.tasks).toHaveLength(10);
  expect(start.deadline - start.startedAt).toBe(900000);
  await page.getByRole('button', { name: '闯关地图', exact: true }).click();
  await page.reload();
  await expect(page.locator('.resume-banner')).toBeVisible();
  expect((await saved(page)).competition!.deadline).toBe(start.deadline);
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key)!);
    s.competition.deadline = Date.now() - 1;
    localStorage.setItem(key, JSON.stringify(s));
  }, STORAGE_KEY);
  await page.reload();
  await expect.poll(async () => (await saved(page)).scores.length).toBe(1);
  expect((await saved(page)).competition).toBeNull();
  await page.reload();
  expect((await saved(page)).scores).toHaveLength(1);
});
test('nickname and validated import/export preserve the local archive', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.profile').click();
  await page.getByLabel('小勇士的昵称').fill('星星');
  await page.getByRole('heading', { name: '我的探险档案' }).click();
  expect((await saved(page)).nickname).toBe('星星');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出存档备份' }).click();
  expect((await download).suggestedFilename()).toContain('智慧小勇士');
  const imported = { ...freshSave(), nickname: '小米', stars: { 'draw:0': 3 } };
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type=file]').setInputFiles({
    name: 'save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(
    page.getByRole('heading', { name: /出发吧，小米/ }),
  ).toBeVisible();
  expect((await saved(page)).stars['draw:0']).toBe(3);
});
test('page reload preserves active route, game level, filter, and growth tab', async ({
  page,
}) => {
  await page.goto('/#/draw/1');
  await expect(page.getByText('第 01 关')).toBeVisible();
  await page.reload();
  await expect(page.getByText('第 01 关')).toBeVisible();
  expect(page.url()).toContain('#/draw/1');

  const data = freshSave();
  data.stars['draw:0'] = 3;
  await seed(page, data);
  await page.goto('/#/draw/2');
  await expect(page.getByText('第 02 关')).toBeVisible();
  await page.reload();
  await expect(page.getByText('第 02 关')).toBeVisible();
  expect(page.url()).toContain('#/draw/2');

  await page.goto('/#/assemble/3');
  await expect(page.getByText('第 03 关')).toBeVisible();
  expect(page.url()).toContain('#/assemble/3');

  await page.goto('/#/match/1?op=remove');
  await expect(page.getByLabel('筛选火柴题型')).toHaveValue('remove');
  await page.reload();
  await expect(page.getByLabel('筛选火柴题型')).toHaveValue('remove');
  expect(page.url()).toContain('op=remove');

  await page.goto('/#/contest');
  await expect(page.getByRole('heading', { name: '思维挑战赛' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '思维挑战赛' })).toBeVisible();
  expect(page.url()).toContain('#/contest');

  await page.goto('/#/growth/mistakes');
  await expect(page.getByRole('tab', { name: /错题练习本/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('tab', { name: /错题练习本/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(page.url()).toContain('#/growth/mistakes');

  await page.goto('/#/growth/scores');
  await expect(page.getByRole('tab', { name: '我的成绩榜' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('tab', { name: '我的成绩榜' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(page.url()).toContain('#/growth/scores');
});
