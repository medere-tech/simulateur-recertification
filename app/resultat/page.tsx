// Écran 6 — Résultat gratuit
// Wrapper Server Component — ResultatClient gère state + scoring via URL params

import { Suspense } from "react";
import ResultatClient from "@/components/ResultatClient";

export default function ResultatPage() {
  return (
    <Suspense fallback={<ResultatSkeleton />}>
      <ResultatClient />
    </Suspense>
  );
}

function ResultatSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">
      <div className="h-[57px] border-b border-[#DBD6CD] bg-white" />
      <div className="h-[60px] bg-[#DBD6CD]" />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#DBD6CD] border-t-[#006E90]" />
      </div>
    </div>
  );
}
