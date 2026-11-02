import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

/** Every admin page starts with the admin links; each page still checks the admin and the second step itself. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
