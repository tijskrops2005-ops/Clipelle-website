import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { dict } from "@/content/i18n";
import { localizePath, type Locale } from "@/lib/i18n";

/**
 * Right side of the site header (server component behind Suspense, so the site pages stay static):
 * signed out → Log in, Book a demo and the main button; signed in → Studio and the account.
 */
export async function HeaderAccount({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  const user = await getUser();
  if (!user) return <SignedOutButtons locale={locale} />;
  const label = config.demoMode ? "Demo" : user.name?.split(" ")[0] || user.email;
  return (
    <>
      <Link href="/settings" className="focus-ring hidden items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex" aria-label={t.common.accountSettings}>
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-surface" aria-hidden>{label.charAt(0).toUpperCase()}</span>
        <span className="max-w-32 truncate">{label}</span>
      </Link>
      <Button href="/dashboard" variant="accent" size="md">
        {t.common.openStudio}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

export function SignedOutButtons({ locale = "en" }: { locale?: Locale }) {
  const t = dict(locale);
  return (
    <>
      <Link href="/login" className="focus-ring hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex">{t.common.logIn}</Link>
      <Button href={localizePath("/demo", locale)} variant="secondary" size="md" className="hidden rounded-full lg:inline-flex">{t.common.bookDemo}</Button>
      <Button href="/signup" variant="accent" size="md">
        <span className="hidden sm:inline">{t.common.createFirstAd}</span>
        <span className="sm:hidden">{t.common.startFree}</span>
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}
