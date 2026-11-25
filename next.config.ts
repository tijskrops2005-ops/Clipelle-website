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
      { source: "/settings/connections", destination: "/app/settings", permanent: false },
      // Brand left the settings on 25 Nov 2026 (Tijs).
      { source: "/settings/brand", destination: "/app/settings", permanent: false },
      { source: "/app/settings/brand", destination: "/app/settings", permanent: false },
      // The app lives under /app since 25 Nov 2026 (Tijs, after splister.com/app): every old address keeps working.
      { source: "/dashboard", destination: "/app", permanent: true },
      // Translate lives at /app/translate since 25 Nov 2026 (Tijs: no /new in the address).
      { source: "/app/new/translate", destination: "/app/translate", permanent: true },
      { source: "/new/translate", destination: "/app/translate", permanent: true },
      ...["projects", "new", "settings", "edit", "tools", "enhance", "batches"].flatMap((p) => [
        { source: `/${p}`, destination: `/app/${p}`, permanent: true },
        { source: `/${p}/:path*`, destination: `/app/${p}/:path*`, permanent: true },
      ]),
      { source: "/solutions", destination: "/solutions/ecommerce-brands", permanent: false },
      { source: "/integrations", destination: "/integrations/api", permanent: false },
      { source: "/company", destination: "/about", permanent: false },
      { source: "/docs", destination: "/docs/api", permanent: false },
      { source: "/creations", destination: "/app/new", permanent: false },
      // English only since 25 Nov 2026 (Tijs): every Dutch address lands on the same English page.
      { source: "/nl", destination: "/", permanent: true },
      { source: "/nl/:path*", destination: "/:path*", permanent: true },
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
