"use client";

// Header sticky avec shadow dynamique au scroll
// Logo responsive : h-7 mobile / h-9 sm / h-11 lg

import { useEffect, useState } from "react";
import Image from "next/image";
import TrustBadge from "@/components/TrustBadge";

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex items-center justify-between border-b border-[#DBD6CD] bg-white/90 px-4 py-3 backdrop-blur-[8px] transition-shadow duration-200 sm:px-6 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <Image
        src="/images/logo-medere-black.png"
        alt="Médéré"
        height={44}
        width={165}
        priority
        className="h-7 sm:h-9 lg:h-11"
        style={{ width: "auto" }}
      />
      <TrustBadge />
    </header>
  );
}
