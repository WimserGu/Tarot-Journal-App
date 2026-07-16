import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Moonlight Phase 5 surface migration', () => {
  it.each([
    'app/draw/history.tsx',
    'app/draw/[drawSessionId].tsx',
    'app/questions/history.tsx',
    'app/onboarding.tsx',
    'app/artwork.tsx',
  ])('%s uses the Moonlight surface instead of legacy screen tokens', (path) => {
    const content = source(path);

    expect(content).toContain('MysticScreen');
    expect(content).not.toContain("from '@/components/Screen'");
    expect(content).not.toContain("from '@/theme/tokens'");
  });

  it('keeps history and onboarding pages connected to their existing services', () => {
    expect(source('app/draw/history.tsx')).toContain('drawSessionRepository');
    expect(source('app/questions/history.tsx')).toContain('useQuestionHistory');
    expect(source('app/onboarding.tsx')).toContain('questionTemplateRepository');
    expect(source('app/artwork.tsx')).toContain('rwsArtworkManifest');
  });
});
