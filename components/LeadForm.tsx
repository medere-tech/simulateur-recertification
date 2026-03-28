"use client";

// Formulaire de capture email - Écran 7
// Validation live (onBlur + live après premier blur), blacklist domaines perso

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GA4 } from "@/lib/ga4";
import { LockIcon, CheckIcon, AlertIcon } from "@/components/icons";

// ─── Domaines personnels refusés ──────────────────────────────────────────────

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.fr", "yahoo.com", "hotmail.com", "hotmail.fr",
  "outlook.com", "outlook.fr", "live.fr", "live.com", "orange.fr",
  "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr", "icloud.com",
  "me.com", "protonmail.com", "protonmail.ch", "gmx.fr", "gmx.com", "aol.com",
]);

// ─── Helpers de validation ────────────────────────────────────────────────────

type FieldState = "idle" | "valid" | "error";
type ValidationResult = { state: FieldState; message: string };

function validateEmailValue(value: string): ValidationResult {
  if (!value) return { state: "idle", message: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { state: "error", message: "Adresse email invalide" };
  }
  const domain = value.split("@")[1]?.toLowerCase() ?? "";
  if (PERSONAL_DOMAINS.has(domain)) {
    return { state: "error", message: "Veuillez utiliser votre email professionnel" };
  }
  return { state: "valid", message: "" };
}

function validatePhoneValue(value: string): ValidationResult {
  if (!value.trim()) return { state: "idle", message: "" };
  const cleaned = value.replace(/[\s\-\.()/]/g, "");
  if (/^(0[1-9]\d{8}|(\+33|0033)[1-9]\d{8})$/.test(cleaned)) {
    return { state: "valid", message: "" };
  }
  return { state: "error", message: "Format attendu : 06 xx xx xx xx" };
}

// ─── Sous-composant champ texte avec feedback visuel ─────────────────────────

function FieldWrapper({
  validation,
  children,
}: {
  validation: ValidationResult;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {validation.state !== "idle" && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-fade-in">
          {validation.state === "valid" ? (
            <CheckIcon size={16} className="text-[#2DA131]" />
          ) : (
            <AlertIcon size={16} className="text-[#CC0000]" />
          )}
        </div>
      )}
    </div>
  );
}

function inputBorder(v: ValidationResult) {
  if (v.state === "error") return "border-[#CC0000] focus:border-[#CC0000]";
  if (v.state === "valid") return "border-[#2DA131] focus:border-[#2DA131]";
  return "border-[#DBD6CD] focus:border-[#9C9494]";
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Props = {
  profession: string;
  score: number;
  urgency: string;
  bloc1Status: string;
  bloc2Status: string;
  diplomaYear: string;
  dpcFormations: string;
  eppActions: string;
  awareness: string;
  accentColor: string;
  textOnAccent: string;
  planParams: string;
};

export default function LeadForm({
  profession,
  score,
  urgency,
  bloc1Status,
  bloc2Status,
  diplomaYear,
  dpcFormations,
  eppActions,
  awareness,
  accentColor,
  textOnAccent,
  planParams,
}: Props) {
  const router = useRouter();

  const [email, setEmail]               = useState("");
  const [phone, setPhone]               = useState("");
  const [rgpd, setRgpd]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [submitError, setSubmitError]   = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Email : live dès qu'il y a un "@" dans la saisie
  const emailV: ValidationResult = email.includes("@")
    ? validateEmailValue(email)
    : { state: "idle", message: "" };

  const phoneV = phoneTouched
    ? validatePhoneValue(phone)
    : { state: "idle" as FieldState, message: "" };

  const emailOk  = validateEmailValue(email).state === "valid";
  const phoneOk  = !phone.trim() || validatePhoneValue(phone).state === "valid";
  const canSubmit = emailOk && phoneOk && rgpd && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.trim()) setPhoneTouched(true);
    if (!canSubmit) return;

    setLoading(true);
    setSubmitError("");

    try {
      // ── 1. Créer/mettre à jour le contact HubSpot ───────────────────────────
      const leadRes = await fetch("/api/lead", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone:         phone.trim() || undefined,
          profession,
          diplomaYear,
          dpcFormations,
          eppActions,
          awareness,
          score,
          urgency,
          bloc1Status,
          bloc2Status,
          source: "simulateur_web",
        }),
      });

      if (!leadRes.ok) {
        const data = await leadRes.json() as { error?: string };
        throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
      }

      // ── 2. Fire GA4 après confirmation serveur ──────────────────────────────
      GA4.emailCaptured(profession, score, "plan_action");
      if (phone.trim()) GA4.phoneCaptured(profession, score);

      // ── 3. Appel PDF (non bloquant) ─────────────────────────────────────────
      fetch("/api/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, profession, diplomaYear, dpcFormations, eppActions, awareness, score, urgency, bloc1Status, bloc2Status }),
      }).catch(() => {/* silencieux - génération PDF non bloquante */});

      // ── 4. Redirect vers confirmation ───────────────────────────────────────
      const sp = new URLSearchParams(planParams);
      sp.set("confirmed", "true");
      router.push(`/plan-action?${sp.toString()}`);

    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Email ────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#302D2D]">
          Email professionnel{" "}
          <span aria-hidden="true" className="text-[#CC0000]">*</span>
        </label>
        <FieldWrapper validation={emailV}>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@cabinet.fr"
            className={`w-full rounded-xl border bg-white px-4 py-3 pr-10 text-sm text-[#302D2D] placeholder-[#9C9494] outline-none transition-colors duration-150 focus:ring-2 focus:ring-[#302D2D]/10 ${inputBorder(emailV)}`}
            aria-invalid={emailV.state === "error"}
            aria-describedby={emailV.message ? "email-error" : undefined}
          />
        </FieldWrapper>
        {emailV.message && (
          <p id="email-error" className="mt-1.5 animate-fade-in text-xs text-[#CC0000]">
            {emailV.message}
          </p>
        )}
      </div>

      {/* ── Téléphone ────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-[#302D2D]">
          Téléphone
        </label>
        <FieldWrapper validation={phoneV}>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => { if (phone.trim()) setPhoneTouched(true); }}
            placeholder="06 xx xx xx xx"
            className={`w-full rounded-xl border bg-white px-4 py-3 pr-10 text-sm text-[#302D2D] placeholder-[#9C9494] outline-none transition-colors duration-150 focus:ring-2 focus:ring-[#302D2D]/10 ${inputBorder(phoneV)}`}
            aria-invalid={phoneV.state === "error"}
            aria-describedby={phoneV.message ? "phone-error" : undefined}
          />
        </FieldWrapper>
        {phoneV.message ? (
          <p id="phone-error" className="mt-1.5 animate-fade-in text-xs text-[#CC0000]">
            {phoneV.message}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-[#807778]">
            Pour un accompagnement personnalisé par un conseiller Médéré - optionnel
          </p>
        )}
      </div>

      {/* ── RGPD ─────────────────────────────────────────────────────── */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DBD6CD] bg-white p-4 transition-colors duration-150 hover:border-[#9C9494]">
        <input
          type="checkbox"
          required
          checked={rgpd}
          onChange={(e) => setRgpd(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer"
          style={{ accentColor }}
        />
        <span className="text-xs leading-relaxed text-[#554F4F]">
          J&apos;accepte de recevoir mon plan d&apos;action et des informations
          sur les formations Médéré éligibles à ma certification périodique.
        </span>
      </label>

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-lg font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: accentColor, color: textOnAccent }}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Envoi en cours…
          </>
        ) : (
          "Recevoir mon plan d'action"
        )}
      </button>

      {/* ── Erreur globale ───────────────────────────────────────────── */}
      {submitError && (
        <p className="animate-fade-in rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {submitError}
        </p>
      )}

      {/* ── Confiance ────────────────────────────────────────────────── */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-[#807778]">
        <LockIcon size={13} />
        Vos données sont uniquement utilisées pour votre plan d&apos;action
      </p>

    </form>
  );
}
