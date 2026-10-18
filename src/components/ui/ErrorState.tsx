import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <EmptyState
      icon={<AlertTriangle className="size-6 text-danger" aria-hidden />}
      title={title}
      description={description}
      action={action}
    />
  );
}
