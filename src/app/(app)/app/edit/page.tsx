import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { EditPicker } from "@/components/edit/EditPicker";

export const metadata: Metadata = { title: "Edit a video" };

/** Pick a finished video to open on the edit screen (23 Nov 2026, Tijs: reachable from the menu, not only from the video itself). */
export default function EditPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Edit a video" description="Trim, cut, captions, text and logo. The result is saved as a new version." />
      <EditPicker />
    </div>
  );
}
