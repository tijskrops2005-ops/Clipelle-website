import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClass, controlStateClass } from "@/components/ui/Field";

export function Textarea({
  className,
  invalid,
  ...props
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        controlClass,
        controlStateClass(invalid),
        "min-h-28 resize-y py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
