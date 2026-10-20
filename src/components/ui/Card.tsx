import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Soft white surface with a layered shadow — the basic building block of every page. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card bg-surface shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pt-5 pb-3 sm:px-7 sm:pt-7", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3 className={cn("text-lg font-semibold text-ink", className)} {...props} />
  );
}

/** 15px muted line under a card title. */
export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1 text-[15px] leading-relaxed text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5 sm:px-7 sm:pb-7", className)} {...props} />;
}
