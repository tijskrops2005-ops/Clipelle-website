import Link from "next/link";
import { LogoLockup } from "@/components/Logo";

/** App sidebar brand: the compact lockup (icon + name) from the brand style guide, linking to the dashboard. */
export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="focus-ring inline-flex rounded-control">
      <LogoLockup />
    </Link>
  );
}
