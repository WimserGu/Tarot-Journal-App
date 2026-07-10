import { describe, expect, it } from 'vitest';

import { createSubmissionGuard } from '../submissionGuard';

describe('createSubmissionGuard', () => {
  it('runs only one concurrent submission and allows a later retry', async () => {
    const guard = createSubmissionGuard();
    let releaseFirstSave: (() => void) | undefined;
    let callCount = 0;
    const firstSave = guard.run(
      () =>
        new Promise<string>((resolve) => {
          callCount += 1;
          releaseFirstSave = () => resolve('saved');
        }),
    );
    const duplicateSave = guard.run(async () => {
      callCount += 1;
      return 'duplicate';
    });

    expect(await duplicateSave).toBeNull();
    expect(callCount).toBe(1);

    releaseFirstSave?.();
    expect(await firstSave).toBe('saved');

    expect(
      await guard.run(async () => {
        callCount += 1;
        return 'retry';
      }),
    ).toBe('retry');
    expect(callCount).toBe(2);
  });
});
