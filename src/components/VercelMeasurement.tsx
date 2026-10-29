"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics and Speed Insights (29 Oct 2026): cookieless, aggregated page views and load
 * times, sent only from deployments on Vercel. Addresses that carry a token (share links, invites,
 * sign-in callbacks) are not sent; other addresses keep only their utm_ parameters.
 */
function redact<T extends { url: string }>(event: T): T | null {
  const url = new URL(event.url);
  if (/^\/(share|invite|auth)\//.test(url.pathname)) return null;
  for (const key of [...url.searchParams.keys()]) if (!key.startsWith("utm_")) url.searchParams.delete(key);
  return { ...event, url: url.toString() };
}

export function VercelMeasurement() {
  return (
    <>
      <Analytics beforeSend={redact} />
      <SpeedInsights beforeSend={redact} />
    </>
  );
}
