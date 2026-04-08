"use client";

// Modal RDV - ouvre le lien HubSpot meetings dans un nouvel onglet
// Mobile : sheet plein écran depuis le bas
// Desktop : modal centré max-w-lg
// Escape + clic overlay pour fermer, focus sur bouton close à l'ouverture

import { useEffect, useRef } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const meetingUrl = process.env.NEXT_PUBLIC_HUBSPOT_MEETING_URL || "";

export default function RdvModal({ isOpen, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Empêche le scroll du body
    document.body.style.overflow = "hidden";

    // Focus sur le bouton fermer (accessibilité)
    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    // Escape pour fermer
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Overlay
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in sm:items-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-hidden="false"
    >
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdv-modal-title"
        className="flex w-full flex-col overflow-hidden rounded-t-2xl bg-white animate-hero-in sm:max-w-lg sm:rounded-2xl"
      >

        {/* Header hauteur fixe h-14 */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#DBD6CD] px-5">
          <h2
            id="rdv-modal-title"
            className="text-base font-bold text-[#302D2D]"
          >
            Prendre rendez-vous
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fermer le modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9C9494] transition-colors duration-150 hover:bg-[#F0EAE5] hover:text-[#302D2D]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-bold text-[#302D2D]">
              Prenez rendez-vous avec un conseiller Médéré
            </p>
            <p className="text-sm text-[#6B6262]">
              Choisissez un créneau qui vous convient pour un accompagnement personnalisé sur votre certification périodique.
            </p>
          </div>

          {meetingUrl && (
            <button
              onClick={() => window.open(meetingUrl, "_blank")}
              className="w-full rounded-xl bg-[#006E90] px-6 py-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-[#005a77]"
            >
              Choisir un créneau →
            </button>
          )}

          <p className="text-xs text-[#9C9494]">Gratuit · 15 minutes · Sans engagement</p>

          <button
            onClick={onClose}
            className="text-sm text-[#6B6262] underline underline-offset-2 hover:text-[#302D2D]"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
