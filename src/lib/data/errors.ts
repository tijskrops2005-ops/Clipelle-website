/** The data layer's error, with a status and a stable code; mapped to JSON by dataErrorResponse. */
export class DataError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "bad_request", cause?: unknown) {
    super(message, cause instanceof Error ? { cause } : undefined);
    this.name = "DataError";
  }
}
