import type { createSessionRevision } from './session';

type SessionRevision = ReturnType<typeof createSessionRevision>;

export function createSessionMutationQueue(revision: SessionRevision) {
  let pending = Promise.resolve();

  return function enqueue(attempt: number, mutation: () => Promise<void>): Promise<boolean> {
    const operation = pending.catch(() => undefined).then(async () => {
      if (!revision.isCurrent(attempt)) return false;
      await mutation();
      return revision.isCurrent(attempt);
    });
    pending = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };
}
