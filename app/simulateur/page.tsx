// Écrans 2-5 — Le simulateur (state machine 4 étapes)
// Server Component wrapper — SimulateurClient gère tout le state via URL params

import { Suspense } from "react";
import SimulateurClient from "@/components/SimulateurClient";

export default function SimulateurPage() {
  return (
    <Suspense fallback={<SimulateurSkeleton />}>
      <SimulateurClient />
    </Suspense>
  );
}

// Skeleton affiché pendant la résolution de useSearchParams
function SimulateurSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">
      <div className="h-[57px] border-b border-[#DBD6CD] bg-white" />
      <div className="h-[60px] bg-white shadow-sm" />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DBD6CD] border-t-[#006E90]" />
      </div>
    </div>
  );
}
