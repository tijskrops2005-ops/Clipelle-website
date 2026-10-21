import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/Button";

/**
 * Right side of the site header (server component behind Suspense, so the site pages stay static):
 * signed out → Log in, Book a demo and the main button; signed in → Studio and the account.
 */
export async function HeaderAccount() {
  const user = await getUser();
  if (!user) return <SignedOutButtons />;
  const label = config.demoMode ? "Demo" : user.name?.split(" ")[0] || user.email;
  return (
    <>
      <Link href="/settings" className="focus-ring hidden items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex" aria-label="Account settings">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-surface" aria-hidden>{label.charAt(0).toUpperCase()}</span>
        <span className="max-w-32 truncate">{label}</span>
      </Link>
      <Button href="/dashboard" variant="accent" size="md">
        Open Studio
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

export function SignedOutButtons() {
  return (
    <>
      <Link href="/login" className="focus-ring hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink/5 sm:inline-flex">Log in</Link>
      <Button href="/demo" variant="secondary" size="md" className="hidden rounded-full lg:inline-flex">Book a demo</Button>
      <Button href="/signup" variant="accent" size="md">
        <span className="hidden sm:inline">Create your first ad free</span>
        <span className="sm:hidden">Start free</span>
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}
