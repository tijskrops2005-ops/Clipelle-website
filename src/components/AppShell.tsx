import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DemoModeBanner } from "@/components/DemoModeBadge";

/**
 * Persistent frame for every app page: sidebar on the left, scrollable content on the right.
 * Mobile navigation comes in Stage 5 (polish); for now the sidebar is hidden below md.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <DemoModeBanner />
        <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
