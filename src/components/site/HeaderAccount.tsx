import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import type { Locale } from "@/lib/i18n";

/**
 * Right side of the site header. Signed out: "Log in" and "Start for free" (both to the sign-in
 * pages). Signed in: your initial and first name (to Settings) and "Dashboard". Demo mode has no
 * real accounts, so it always shows the signed-out buttons. Rendered behind Suspense with the
 * signed-out buttons as fallback, so the site pages stay static and only this slot streams in.
 */
export async function HeaderAccount({ locale = "en" }: { locale?: Locale }) {
  if (config.demoMode) return <HeaderAuthButtons locale={locale} />;
  const user = await getUser();
  if (!user) return <HeaderAuthButtons locale={locale} />;
  const t = dict(locale);
  const label = user.name?.split(" ")[0] || user.email.split("@")[0];
  return (
    <>
      <Link href="/settings" aria-label={t.common.accountSettings} className="focus-ring hidden items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-surface" aria-hidden>{label.charAt(0).toUpperCase()}</span>
        <span className="max-w-32 truncate">{label}</span>
      </Link>
      <Button href="/dashboard" variant="accent" size="md">
        Dashboard
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

export function HeaderAuthButtons({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  return (
    <>
      <Link href="/login" className="focus-ring hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex">{t.common.logIn}</Link>
      <Button href="/signup" variant="accent" size="md">
        {t.common.startFree}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}
