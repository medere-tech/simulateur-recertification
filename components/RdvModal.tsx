"use client";

// Modal RDV - iframe HubSpot meetings
// Mobile : sheet plein écran depuis le bas
// Desktop : modal centré max-w-lg
// Escape + clic overlay pour fermer, focus sur bouton close à l'ouverture

import { useEffect, useRef } from "react";
import { CONFIG } from "@/lib/config";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

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
      {/* Modal - overflow:hidden strict, pas de scroll interne */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdv-modal-title"
        className="flex h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white animate-hero-in sm:h-[80vh] sm:max-w-lg sm:rounded-2xl"
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

        {/* iframe - remplit exactement l'espace restant, pas de scrollbar */}
        {CONFIG.HUBSPOT_MEETING_URL ? (
          <iframe
            src={CONFIG.HUBSPOT_MEETING_URL}
            title="Prendre rendez-vous avec Médéré"
            className="w-full flex-1 border-0"
            allow="camera; microphone"
          />
        ) : null}

      </div>
    </div>
  );
}
