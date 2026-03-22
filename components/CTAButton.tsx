"use client";

// Bouton CTA principal — Écran 1
// Prefetch /simulateur au mount pour une navigation instantanée

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GA4 } from "@/lib/ga4";
import { ArrowRightIcon } from "@/components/icons";

export default function CTAButton() {
  const router = useRouter();
  const params = useSearchParams();

  // Prefetch dès le mount pour que la navigation soit instantanée
  useEffect(() => {
    router.prefetch("/simulateur");
  }, [router]);

  function handleClick() {
    const source =
      params.get("utm_source") ?? params.get("ref") ?? "organic";
    GA4.simulatorStart(source);
    router.push("/simulateur?step=1");
  }

  return (
    <button
      onClick={handleClick}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#006E90] px-8 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] sm:w-auto sm:min-w-[340px]"
    >
      Commencer mon diagnostic gratuit
      <ArrowRightIcon size={20} />
    </button>
  );
}
