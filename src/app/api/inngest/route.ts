import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

/**
 * The endpoint Inngest calls to discover and run our functions. In development the local
 * dev server (npm run dev:jobs) talks to it; in production Inngest Cloud does, with requests
 * signed by INNGEST_SIGNING_KEY. Not a user-facing route.
 */
export const { GET, POST, PUT } = serve({ client: inngest, functions });
