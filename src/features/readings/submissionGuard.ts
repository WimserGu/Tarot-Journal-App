/** Prevents concurrent saves while preserving a retry after the active save settles. */
export function createSubmissionGuard() {
  let isSubmitting = false;

  return {
    async run<T>(action: () => Promise<T>): Promise<T | null> {
      if (isSubmitting) {
        return null;
      }

      isSubmitting = true;

      try {
        return await action();
      } finally {
        isSubmitting = false;
      }
    },
  };
}
