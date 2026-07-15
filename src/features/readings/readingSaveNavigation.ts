export type ReadingSaveRouter = {
  dismissAll(): void;
  push(route: { pathname: '/readings/[readingId]'; params: { readingId: string } }): void;
  replace(route: { pathname: '/readings/[readingId]'; params: { readingId: string } }): void;
};

/**
 * A draw starts above the home tab in the root stack. Clear that completed
 * workflow before opening its Reading so Back returns to Home, not the table.
 */
export function navigateAfterReadingSave(
  router: ReadingSaveRouter,
  readingId: string,
  wasCreatedFromDraw: boolean,
): void {
  const detailRoute = {
    pathname: '/readings/[readingId]' as const,
    params: { readingId },
  };

  if (wasCreatedFromDraw) {
    router.dismissAll();
    router.push(detailRoute);
    return;
  }

  router.replace(detailRoute);
}
