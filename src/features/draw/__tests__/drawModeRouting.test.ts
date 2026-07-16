import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { drawModeForSession, drawRouteForMode } from '../drawModeRoutes';
import type { DrawSession } from '../drawTypes';

const root = resolve(__dirname, '../../../..');
const selectionSource = readFileSync(resolve(root, 'app/draw/index.tsx'), 'utf8');
const homeSource = readFileSync(resolve(root, 'app/(tabs)/index.tsx'), 'utf8');

describe('draw mode information architecture', () => {
  it('keeps the home instant-draw entry pointed at the mode selection page', () => {
    expect(homeSource).toContain("router.push('/draw'");
    expect(homeSource).toContain('手动录入实体牌');
  });

  it('shows four draw modes, excludes manual entry, and keeps history secondary', () => {
    expect(selectionSource).toContain('选择抽牌方式');
    expect(selectionSource).toContain('自由牌桌');
    expect(selectionSource).toContain('单张牌阵');
    expect(selectionSource).toContain('三张牌阵');
    expect(selectionSource).toContain('自定义牌阵');
    expect(selectionSource).not.toContain('手动录入实体牌');
    expect(selectionSource).toContain('<SectionLabel title="其他"');
    expect(selectionSource).toContain('抽牌历史');
  });

  it('routes each implemented mode independently and identifies its active draft', () => {
    expect(drawRouteForMode('free-table')).toBe('/draw/table');
    expect(drawRouteForMode('single-card')).toBe('/draw/single');
    expect(drawRouteForMode('three-cards')).toBe('/draw/three-card');
    expect(drawModeForSession({ configuration: { spreadId: 'three-cards' } } as DrawSession)).toBe(
      'three-cards',
    );
  });

  it('keeps custom spread honest until its editor exists', () => {
    const customSource = readFileSync(resolve(root, 'app/draw/custom.tsx'), 'utf8');
    expect(customSource).toContain('即将开放');
    expect(customSource).toContain('尚未实现');
  });
});
