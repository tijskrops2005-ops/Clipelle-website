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
  // Bare section URLs people type by hand (24 Nov 2026 route audit) land on the right page instead of a 404.
  async redirects() {
    return [
      { source: "/mcp", destination: "/docs/mcp", permanent: true },
      { source: "/settings/connections", destination: "/settings", permanent: false },
      { source: "/solutions", destination: "/solutions/ecommerce-brands", permanent: false },
      { source: "/integrations", destination: "/integrations/api", permanent: false },
      { source: "/company", destination: "/about", permanent: false },
      { source: "/docs", destination: "/docs/api", permanent: false },
      { source: "/creations", destination: "/new", permanent: false },
      { source: "/nl/solutions", destination: "/nl/solutions/ecommerce-brands", permanent: false },
      { source: "/nl/integrations", destination: "/nl/integrations/api", permanent: false },
      { source: "/nl/company", destination: "/nl/about", permanent: false },
    ];
  },
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
