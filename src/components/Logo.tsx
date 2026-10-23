import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The brand artwork (brand style guide v1.1): the full logo where it can be at least ~120px
 * wide, otherwise the compact lockup of the app icon and the name in Geist SemiBold. Files live
 * in public/brand/ (see docs/brand-assets.md); the dark logo is for paper and white, the light
 * one for ink. Nothing here draws the name in another font as a "logo".
 */
const FULL = { dark: "/brand/clipelle-logo-dark-600.png", light: "/brand/clipelle-logo-light-600.png" } as const;
const FULL_SIZE = { width: 600, height: 228 } as const;

export function LogoFull({ tone = "dark", className, priority }: { tone?: "dark" | "light"; className?: string; priority?: boolean }) {
  return <Image src={FULL[tone]} alt={brand.name} width={FULL_SIZE.width} height={FULL_SIZE.height} priority={priority} className={cn("h-10 w-auto", className)} />;
}

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return <Image src="/brand/icon-192.png" alt="" aria-hidden width={size} height={size} className={cn("rounded-[9px]", className)} style={{ width: size, height: size }} />;
}

/** Icon + name: the sidebar, the mobile drawer and any place narrower than the full logo. */
export function LogoLockup({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[17px] font-semibold tracking-tight", tone === "dark" ? "text-ink" : "text-champagne")}>{brand.name}</span>
    </span>
  );
}
