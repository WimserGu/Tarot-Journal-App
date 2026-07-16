import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Moonlight Phase 4 surface migration', () => {
  it.each([
    'app/(tabs)/settings.tsx',
    'app/(auth)/welcome.tsx',
    'app/(auth)/sign-in.tsx',
    'app/(auth)/sign-up.tsx',
    'app/(auth)/forgot-password.tsx',
    'app/(auth)/verify-email.tsx',
    'app/(auth)/recovery.tsx',
    'app/reviews/index.tsx',
    'app/reviews/[reviewId].tsx',
    'app/followups/index.tsx',
    'app/followups/new.tsx',
    'app/followups/[followUpId].tsx',
    'app/followups/complete.tsx',
    'app/followups/edit.tsx',
  ])('%s uses the Moonlight surface instead of legacy screen tokens', (path) => {
    const content = source(path);

    expect(content).toContain('MysticScreen');
    expect(content).not.toContain("from '@/components/Screen'");
    expect(content).not.toContain("from '../../src/components/Screen'");
    expect(content).not.toContain("from '@/theme/tokens'");
    expect(content).not.toContain("from '../../src/theme/tokens'");
  });

  it('keeps Auth, Review and Follow-up pages connected to their existing services', () => {
    expect(source('app/(auth)/sign-in.tsx')).toContain('signInSchema');
    expect(source('app/reviews/index.tsx')).toContain('reviewCoordinator');
    expect(source('app/followups/complete.tsx')).toContain('followUpRepository');
  });
});
