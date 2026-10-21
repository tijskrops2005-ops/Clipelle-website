"use client";

import { useEffect } from "react";

/** Sets <html lang> for the Dutch pages (the root layout renders "en" for every route). */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);
  return null;
}
