import type { Metadata } from "next";
import { Suspense } from "react";
import { EditView } from "@/components/edit/EditView";

export const metadata: Metadata = { title: "Edit video" };

type Params = Promise<{ id: string }>;

/** The edit screen of a finished video (2 Nov 2026): trim, cut, captions, text and logo, then Export as a new version. */
async function EditRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <EditView id={id} />;
}

export default function EditPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <EditRoute params={params} />
    </Suspense>
  );
}
