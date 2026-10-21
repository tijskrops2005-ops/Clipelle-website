import type { Metadata } from "next";
import { Suspense } from "react";
import { BatchView } from "@/components/BatchView";

export const metadata: Metadata = { title: "Variations" };

type Params = Promise<{ id: string }>;

async function BatchRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <BatchView id={id} />;
}

export default function BatchPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <BatchRoute params={params} />
    </Suspense>
  );
}
