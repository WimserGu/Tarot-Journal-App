import { describe, expect, it, vi } from 'vitest';

import { navigateAfterReadingSave, type ReadingSaveRouter } from '../readingSaveNavigation';

function routerMock() {
  const router = {
    dismissAll: vi.fn<ReadingSaveRouter['dismissAll']>(),
    push: vi.fn<ReadingSaveRouter['push']>(),
    replace: vi.fn<ReadingSaveRouter['replace']>(),
  };

  return router satisfies ReadingSaveRouter;
}

describe('navigation after saving a Reading', () => {
  it('clears the draw workflow before opening a Reading created from a draw', () => {
    const router = routerMock();

    navigateAfterReadingSave(router, 'reading-1', true);

    expect(router.dismissAll).toHaveBeenCalledOnce();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/readings/[readingId]',
      params: { readingId: 'reading-1' },
    });
    expect(router.dismissAll.mock.invocationCallOrder[0]!).toBeLessThan(
      router.push.mock.invocationCallOrder[0]!,
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('preserves the existing replacement behavior for manual Reading creation', () => {
    const router = routerMock();

    navigateAfterReadingSave(router, 'reading-2', false);

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/readings/[readingId]',
      params: { readingId: 'reading-2' },
    });
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
