/** Rejects after `ms` with a plain message; the underlying work is not cancelled, only no longer waited for. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(ms: number, message: string, work: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  try {
    return await Promise.race([work(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
