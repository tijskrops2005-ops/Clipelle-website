import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

/** Admin pages are personal and read the session and the database at request time (like the rest of the app group). */
export const instant = false;

/** Every admin page starts with the admin links; each page still checks the admin and the second step itself. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
