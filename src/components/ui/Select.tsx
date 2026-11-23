import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass, controlStateClass } from "@/components/ui/Field";

type SelectProps = Omit<ComponentProps<"select">, "size"> & {
  invalid?: boolean;
  /** "md" matches the form fields (44 px); "sm" sits in a row of small controls (40 px). */
  size?: "sm" | "md";
};

/**
 * A short list of choices (23 Nov 2026): a real `<select>`, so phones open their own picker and the
 * keyboard works as expected, drawn like the closed field of `SearchableSelect` (same border,
 * height and chevron). Before this the browser's own grey dropdown sat right under the language
 * picker. Long lists that need a search keep `SearchableSelect`.
 */
export function Select({ invalid, size = "md", className, children, ...props }: SelectProps) {
  return (
    <span className={cn("relative block", className)}>
      <select {...props} data-invalid={invalid || undefined} className={cn(controlClass, controlStateClass(invalid), "cursor-pointer appearance-none pr-10 disabled:cursor-not-allowed", size === "md" ? "min-h-11" : "h-10 text-sm")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}
