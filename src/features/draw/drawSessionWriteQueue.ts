import type { DrawSession } from './drawTypes';

type DrawSessionWriter = (session: DrawSession) => Promise<DrawSession>;

type PendingWrite = {
  session: DrawSession;
  waiters: {
    resolve: (session: DrawSession) => void;
    reject: (reason: unknown) => void;
  }[];
};

export function createLatestDrawSessionWriteQueue(write: DrawSessionWriter) {
  let active = false;
  let pending: PendingWrite | null = null;

  const run = async (entry: PendingWrite): Promise<void> => {
    active = true;
    try {
      const saved = await write(entry.session);
      entry.waiters.forEach(({ resolve }) => resolve(saved));
    } catch (error) {
      entry.waiters.forEach(({ reject }) => reject(error));
    } finally {
      const next = pending;
      pending = null;
      if (next) {
        void run(next);
      } else {
        active = false;
      }
    }
  };

  return {
    enqueue(session: DrawSession): Promise<DrawSession> {
      return new Promise((resolve, reject) => {
        if (active) {
          if (pending) {
            pending.session = session;
            pending.waiters.push({ resolve, reject });
          } else {
            pending = { session, waiters: [{ resolve, reject }] };
          }
          return;
        }
        void run({ session, waiters: [{ resolve, reject }] });
      });
    },
  };
}
