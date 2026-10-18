import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DemoModeBadge } from "@/components/DemoModeBadge";

/**
 * Persistent frame for every app page. The sidebar sits on the page background;
 * only cards are white. A slim top row carries the Demo mode label (and later the account).
 * Mobile navigation comes in Stage 5 (polish); for now the sidebar is hidden below md.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-end px-6 md:px-12">
          <DemoModeBadge />
        </div>
        <div className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-4 md:px-12 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
