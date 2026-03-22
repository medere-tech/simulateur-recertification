// Écrans 7 & 8 — Plan d'action + Confirmation
// Suspense nécessaire car PlanActionClient utilise useSearchParams

import { Suspense } from "react";
import PlanActionClient from "@/components/PlanActionClient";

export default function PlanActionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F9F5F2]" />}>
      <PlanActionClient />
    </Suspense>
  );
}
