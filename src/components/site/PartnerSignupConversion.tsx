"use client";

import { useEffect } from "react";
import { allows } from "@/lib/consent";

/**
 * Tells the partner platform that a sign-up happened, so a referral can be matched. Fires once,
 * only when the partner script was loaded (consent for partner tracking + NEXT_PUBLIC_REDITUS_SCRIPT_SRC)
 * and the platform's global exists. Sends the e-mail and our user id as `uid`, nothing else.
 */
declare global {
  interface Window {
    gr?: (action: string, event: string, data: Record<string, string>) => void;
  }
}

export function PartnerSignupConversion({ email, uid }: { email: string; uid?: string }) {
  useEffect(() => {
    if (!allows("marketing")) return;
    const key = `clipelle:partner-conv:${email}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* storage blocked: fire once per page load instead */
    }
    if (typeof window.gr === "function") {
      try {
        window.gr("track", "conversion", uid ? { email, uid } : { email });
        sessionStorage.setItem(key, "1");
      } catch {
        /* the platform's script decides what it accepts */
      }
    }
  }, [email, uid]);
  return null;
}
