import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClass, controlStateClass } from "@/components/ui/Field";

export function Input({
  className,
  invalid,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlClass, controlStateClass(invalid), "h-11", className)}
      {...props}
    />
  );
}
