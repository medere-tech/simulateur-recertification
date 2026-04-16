"use client";

// Modal RDV — formulaire de demande de rappel
// Email pré-rempli depuis le formulaire précédent
// Mobile : plein écran scrollable · Desktop : modal centré max-w-lg
// Escape + clic overlay pour fermer

import { useEffect, useRef, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  phone?: string;
  profession: string;
  professionLabel: string;
  score: number;
  urgency: string;
};

const HEURES = [
  "8h - 10h",
  "10h - 12h",
  "12h - 14h",
  "14h - 16h",
  "16h - 18h",
  "18h - 20h",
];

export default function RdvModal({
  isOpen,
  onClose,
  email,
  phone: phoneInit = "",
  profession,
  professionLabel,
  score,
  urgency,
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);

  const [prenom,     setPrenom]     = useState("");
  const [nom,        setNom]        = useState("");
  const [emailVal,   setEmailVal]   = useState(email);
  const [phoneVal,   setPhoneVal]   = useState(phoneInit);
  const [jourRappel, setJourRappel] = useState("");
  const [heureRappel,setHeureRappel]= useState("");
  const [message,    setMessage]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setPrenom("");
    setNom("");
    setEmailVal(email);
    setPhoneVal(phoneInit);
    setJourRappel("");
    setHeureRappel("");
    setMessage("");
    setSuccess(false);
    setError("");
    setTimeout(() => closeBtnRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Synchroniser l'email si la prop change
  useEffect(() => {
    setEmailVal(email);
  }, [email]);

  // Escape + scroll lock
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inputClass =
    "w-full rounded-xl border border-[#DBD6CD] bg-white px-4 py-3 text-sm text-[#302D2D] placeholder-[#9C9494] outline-none transition-colors duration-150 focus:border-[#9C9494] focus:ring-2 focus:ring-[#302D2D]/10";

  const canSubmit =
    !!prenom.trim() && !!nom.trim() && !!emailVal.trim() &&
    !!phoneVal.trim() && !!jourRappel && !!heureRappel && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const body = {
      prenom:       prenom.trim(),
      nom:          nom.trim(),
      email:        emailVal.trim(),
      phone:        phoneVal.trim(),
      jourRappel,
      heureRappel,
      message:      message.trim() || undefined,
      profession,
      professionLabel,
      score,
      urgency,
    };
    try {
      const res = await fetch("/api/rdv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Erreur lors de l'envoi.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  // Date minimale = aujourd'hui
  const today = new Date().toISOString().split("T")[0];

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
        className="flex h-[100vh] w-full flex-col overflow-hidden bg-white animate-hero-in sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
      >

        {/* Header */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#DBD6CD] px-5">
          <h2
            id="rdv-modal-title"
            className="text-base font-bold text-[#302D2D]"
          >
            Demander un rappel
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
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {success ? (
            /* ── Succès ─────────────────────────────────────────────────── */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2DA131"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#302D2D]">Demande envoyée&nbsp;!</h3>
              <p className="text-sm leading-relaxed text-[#554F4F]">
                Un conseiller Médéré vous rappellera le{" "}
                <strong>
                  {new Date(jourRappel + "T12:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </strong>{" "}
                entre <strong>{heureRappel}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-lg bg-[#F0EAE5] px-6 py-2.5 text-sm font-medium text-[#302D2D] transition-colors duration-150 hover:bg-[#DBD6CD]"
              >
                Fermer
              </button>
            </div>

          ) : (
            /* ── Formulaire ─────────────────────────────────────────────── */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="rdv-prenom"
                    className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                  >
                    Prénom{" "}
                    <span aria-hidden="true" className="text-[#CC0000]">*</span>
                  </label>
                  <input
                    id="rdv-prenom"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Prénom"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="rdv-nom"
                    className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                  >
                    Nom{" "}
                    <span aria-hidden="true" className="text-[#CC0000]">*</span>
                  </label>
                  <input
                    id="rdv-nom"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Nom"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="rdv-email"
                  className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                >
                  Email{" "}
                  <span aria-hidden="true" className="text-[#CC0000]">*</span>
                </label>
                <input
                  id="rdv-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Téléphone */}
              <div>
                <label
                  htmlFor="rdv-phone"
                  className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                >
                  Téléphone{" "}
                  <span aria-hidden="true" className="text-[#CC0000]">*</span>
                </label>
                <input
                  id="rdv-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                  placeholder="06 xx xx xx xx"
                  className={inputClass}
                />
              </div>

              {/* Jour de rappel */}
              <div>
                <label
                  htmlFor="rdv-jour"
                  className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                >
                  Jour de rappel souhaité{" "}
                  <span aria-hidden="true" className="text-[#CC0000]">*</span>
                </label>
                <input
                  id="rdv-jour"
                  type="date"
                  required
                  value={jourRappel}
                  onChange={(e) => setJourRappel(e.target.value)}
                  min={today}
                  className={inputClass}
                />
              </div>

              {/* Créneau horaire */}
              <div>
                <label
                  htmlFor="rdv-heure"
                  className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                >
                  Créneau de rappel souhaité{" "}
                  <span aria-hidden="true" className="text-[#CC0000]">*</span>
                </label>
                <select
                  id="rdv-heure"
                  required
                  value={heureRappel}
                  onChange={(e) => setHeureRappel(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sélectionnez un créneau</option>
                  {HEURES.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="rdv-message"
                  className="mb-1.5 block text-sm font-semibold text-[#302D2D]"
                >
                  Message{" "}
                  <span className="font-normal text-[#9C9494]">(optionnel)</span>
                </label>
                <textarea
                  id="rdv-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Précisez vos questions ou besoins éventuels…"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Erreur globale */}
              {error && (
                <p className="animate-fade-in rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#302D2D] text-base font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Envoi en cours…
                  </>
                ) : (
                  "Demander un rappel"
                )}
              </button>

              <p className="text-center text-xs text-[#9C9494]">
                Un conseiller Médéré vous rappellera au créneau choisi.
              </p>

            </form>
          )}

        </div>

        {/* Footer — masqué après succès */}
        {!success && (
          <div className="flex flex-shrink-0 justify-end border-t border-[#DBD6CD] px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg bg-[#F0EAE5] px-4 py-2 text-sm font-medium text-[#302D2D] transition-colors duration-150 hover:bg-[#DBD6CD]"
            >
              Annuler
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
