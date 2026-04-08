"use client";

// Modal RDV - widget embed officiel HubSpot Meetings
// Mobile : plein écran
// Desktop : modal centré max-w-3xl
// Escape + clic overlay pour fermer

import { useEffect, useRef } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const meetingUrl = process.env.NEXT_PUBLIC_HUBSPOT_MEETING_URL || "";

export default function RdvModal({ isOpen, onClose }: Props) {
  const closeBtnRef        = useRef<HTMLButtonElement>(null);
  const overlayRef         = useRef<HTMLDivElement>(null);
  const meetingContainerRef = useRef<HTMLDivElement>(null);

  // Escape + scroll lock
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

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

  // Chargement du widget embed HubSpot
  useEffect(() => {
    if (!isOpen || !meetingUrl || !meetingContainerRef.current) return;

    // Nettoyer le conteneur
    meetingContainerRef.current.innerHTML = "";

    // Div que HubSpot attend
    const meetingsDiv = document.createElement("div");
    meetingsDiv.className = "meetings-iframe-container";
    meetingsDiv.setAttribute("data-src", meetingUrl + "?embed=true");
    meetingContainerRef.current.appendChild(meetingsDiv);

    // Script embed officiel HubSpot
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";
    script.async = true;
    meetingContainerRef.current.appendChild(script);

    return () => {
      if (meetingContainerRef.current) {
        meetingContainerRef.current.innerHTML = "";
      }
    };
  }, [isOpen]);

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
        className="flex h-[100vh] w-full flex-col overflow-hidden bg-white animate-hero-in sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl"
      >

        {/* Header */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#DBD6CD] px-5">
          <h2
            id="rdv-modal-title"
            className="text-base font-bold text-[#302D2D]"
          >
            Prenez rendez-vous avec un conseiller Médéré
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Fermer le modal"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#9C9494] transition-colors duration-150 hover:bg-[#F0EAE5] hover:text-[#302D2D]"
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
        {meetingUrl ? (
          // Conteneur du widget HubSpot
          <div
            ref={meetingContainerRef}
            className="w-full flex-1 overflow-y-auto"
            style={{ minHeight: "650px" }}
          >
            {/* Texte affiché pendant le chargement du widget */}
            <p className="py-10 text-center text-sm text-[#9C9494]">
              Chargement du planning…
            </p>
          </div>
        ) : (
          // Fallback si URL non configurée
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center">
            <p className="text-base font-semibold text-[#302D2D]">
              Appelez-nous au 01 88 33 95 28
            </p>
            <button
              onClick={onClose}
              className="text-sm text-[#6B6262] underline underline-offset-2 hover:text-[#302D2D]"
            >
              Fermer
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
