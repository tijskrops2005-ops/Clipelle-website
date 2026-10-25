import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Keep the dev terminal readable (25 Oct 2026): the job server's sync calls and step calls, the
  // project-list polling of the status watcher and the health check are not logged. Errors still are.
  logging: {
    incomingRequests: { ignore: [/^\/api\/inngest/, /^\/api\/projects(\?.*)?$/, /^\/api\/health/] },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
