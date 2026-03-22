// Footer premium — commun à toutes les pages via layout.tsx
// Desktop : bande horizontale compacte (3 zones)
// Mobile : empilé centré, discret

import Image from "next/image";
import Link from "next/link";
import { PhoneIcon, MailIcon } from "@/components/icons";

export default function SiteFooter() {
  return (
    <footer className="bg-[#302D2D]">

      {/* ── Bande principale ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:py-5">

        {/* DESKTOP : 3 zones horizontales */}
        <div className="hidden lg:flex lg:items-center lg:justify-between">

          {/* Zone gauche — Logo + DPC */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo-medere-white.png"
              alt="Médéré"
              height={24}
              width={90}
              className="h-6"
              style={{ width: "auto" }}
            />
            <span className="h-4 w-px bg-[#554F4F]" aria-hidden="true" />
            <span className="text-xs text-[#807778]">DPC n°9262</span>
          </div>

          {/* Zone centre — Coordonnées */}
          <div className="flex items-center gap-4 text-xs text-[#9C9494]">
            <Link
              href="tel:+33188339528"
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-white"
            >
              <PhoneIcon size={14} />
              01&nbsp;88&nbsp;33&nbsp;95&nbsp;28
            </Link>
            <span className="text-[#494343]" aria-hidden="true">·</span>
            <Link
              href="mailto:contact@medere.fr"
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-white"
            >
              <MailIcon size={14} />
              contact@medere.fr
            </Link>
          </div>

          {/* Zone droite — Qualiopi + Fondateur */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/badge-qualiopi.png"
              alt="Qualiopi processus certifié"
              height={28}
              width={70}
              className="h-7"
              style={{ width: "auto" }}
            />
            <span className="h-4 w-px bg-[#554F4F]" aria-hidden="true" />
            <span className="text-xs text-[#807778]">Dr Harry Sitbon, médecin vasculaire</span>
          </div>

        </div>

        {/* MOBILE : empilé centré */}
        <div className="flex flex-col items-center gap-3 text-center lg:hidden">

          <Image
            src="/images/logo-medere-white.png"
            alt="Médéré"
            height={24}
            width={90}
            className="h-6"
            style={{ width: "auto" }}
          />

          <div className="flex items-center gap-3 text-xs text-[#9C9494]">
            <Link
              href="tel:+33188339528"
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-white"
            >
              <PhoneIcon size={14} />
              01&nbsp;88&nbsp;33&nbsp;95&nbsp;28
            </Link>
            <span className="text-[#494343]" aria-hidden="true">·</span>
            <Link
              href="mailto:contact@medere.fr"
              className="flex items-center gap-1.5 transition-colors duration-150 hover:text-white"
            >
              <MailIcon size={14} />
              contact@medere.fr
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Image
              src="/images/badge-qualiopi.png"
              alt="Qualiopi processus certifié"
              height={24}
              width={60}
              className="h-6"
              style={{ width: "auto" }}
            />
            <span className="text-xs text-[#807778]">DPC n°9262&nbsp;• Qualiopi</span>
          </div>

          <p className="text-xs text-[#807778]">
            Dr Harry Sitbon, médecin vasculaire
          </p>

        </div>
      </div>

      {/* ── Micro-ligne mentions légales ─────────────────────────────── */}
      <div className="border-t border-[#3F3B3C] px-5 py-2 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="text-[10px] text-[#686162]">
            Basé sur l&apos;arrêté du 26&nbsp;février&nbsp;2026 — NOR&nbsp;: SFHH2605575A
          </span>
          <span className="text-[#494343]" aria-hidden="true">·</span>
          <Link
            href="#"
            className="text-[10px] text-[#686162] transition-colors duration-150 hover:text-[#9C9494]"
          >
            Politique de confidentialité
          </Link>
        </div>
      </div>

    </footer>
  );
}
