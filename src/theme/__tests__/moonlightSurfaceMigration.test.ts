import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Moonlight Phase 3 surface migration', () => {
  it.each([
    'app/(tabs)/insights.tsx',
    'app/(tabs)/topics.tsx',
    'app/topics/[topicId].tsx',
    'app/topics/new.tsx',
    'app/topics/edit.tsx',
    'app/import.tsx',
  ])('%s uses the Moonlight surface instead of legacy screen tokens', (path) => {
    const content = source(path);

    expect(content).toContain('MysticScreen');
    expect(content).not.toContain("from '@/components/Screen'");
    expect(content).not.toContain("from '@/theme/tokens'");
  });

  it('keeps Insights and Import wired to their existing business services', () => {
    expect(source('app/(tabs)/insights.tsx')).toContain('calculateStatistics');
    const importSource = source('app/import.tsx');
    expect(importSource).toContain('parseImportText');
    expect(importSource).toContain('importReviewedReadings');
  });
});
