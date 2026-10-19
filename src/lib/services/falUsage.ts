import "server-only";

/**
 * fal.ai Platform API: usage line items (verified 2026-10-19, https://fal.ai/docs/platform-apis/v1/models/usage).
 * `GET https://api.fal.ai/v1/models/usage?start=…&end=…&expand=summary` returns, per endpoint,
 * the billed quantity, unit price and cost_total for the period. It is aggregated: there is no
 * per-request id, so it can confirm our totals per model per period, not a single call.
 * The API key needs the `billing:usage:read` permission (the BILLING or FULL preset).
 */

export type FalUsageLine = {
  endpoint_id: string;
  unit: string;
  quantity: number;
  unit_price: number;
  cost_total: number;
  currency: string;
};

export class FalUsageError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "FalUsageError";
  }
}

export async function getFalUsage(input: { start: Date; end: Date; endpointIds?: string[] }): Promise<FalUsageLine[]> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new FalUsageError("FAL_KEY is not set.", 500);
  const q = new URLSearchParams({
    start: input.start.toISOString(),
    end: input.end.toISOString(),
    expand: "summary",
    bound_to_timeframe: "false",
    limit: "200",
  });
  for (const id of input.endpointIds ?? []) q.append("endpoint_id", id);
  const res = await fetch(`https://api.fal.ai/v1/models/usage?${q}`, {
    headers: { Authorization: `Key ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    throw new FalUsageError(
      "fal.ai refused the usage request. The API key needs the billing:usage:read permission (create a key with the BILLING or FULL preset in the fal.ai dashboard).",
      res.status,
    );
  }
  if (!res.ok) throw new FalUsageError(`fal.ai usage API error ${res.status}.`, res.status);
  const body = (await res.json()) as { summary?: FalUsageLine[] };
  return body.summary ?? [];
}
