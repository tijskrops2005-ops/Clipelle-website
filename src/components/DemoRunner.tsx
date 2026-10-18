"use client";

import { useEffect } from "react";
import { config } from "@/lib/config";
import { startDemoRunner } from "@/lib/mock/runner";

/** Renders nothing; keeps the simulated workflow ticking while the app is open. */
export function DemoRunner() {
  useEffect(() => {
    if (!config.demoMode) return;
    return startDemoRunner();
  }, []);
  return null;
}
