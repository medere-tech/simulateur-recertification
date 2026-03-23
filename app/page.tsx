// Écran 1 - Accroche premium
// Server Component (LCP optimal) - seul le bouton CTA est client

import { Suspense } from "react";
import CTAButton from "@/components/CTAButton";
import SiteHeader from "@/components/SiteHeader";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  DocumentIcon,
  ArrowRightIcon,
} from "@/components/icons";

// ─── Données stepper ──────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "4 questions",      active: true  },
  { num: 2, label: "Votre diagnostic", active: false },
  { num: 3, label: "Plan d'action",    active: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">

      {/* ── Header sticky ───────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Hero - min-h-screen desktop pour tout tenir dans le viewport */}
      <section className="flex flex-1 items-center px-5 py-14 sm:px-8 sm:py-16 lg:min-h-screen">
        <div className="mx-auto w-full max-w-5xl">

          {/* Grille : colonne unique mobile → 60/40 desktop */}
          <div className="lg:grid lg:grid-cols-5 lg:items-center lg:gap-16">

            {/* ── Colonne gauche (3/5) ──────────────────────────────── */}
            <div className="lg:col-span-3">

              {/* Badge */}
              <div className="mb-6 flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F4F8] px-4 py-1.5 text-xs font-semibold text-[#006E90]">
                  <DocumentIcon size={13} />
                  Arrêté du 26&nbsp;février&nbsp;2026 - Référentiel officiel
                </span>
              </div>

              {/* H1 */}
              <h1 className="animate-hero-in text-center text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-left lg:text-6xl">
                <span className="block text-[#302D2D]">Votre diagnostic de certification</span>
                <span className="block text-[#006E90]">en 2&nbsp;minutes</span>
              </h1>

              {/* Sous-titre */}
              <p
                className="animate-hero-in mt-5 text-center text-lg leading-relaxed text-[#686162] lg:text-left"
                style={{ animationDelay: "100ms" }}
              >
                Professionnels de santé, répondez à 4&nbsp;questions simples. Découvrez où vous en êtes dans
                votre parcours de certification périodique et ce qu&apos;il vous
                reste à faire avant le prochain contrôle de votre CNP.
              </p>

              {/* Stepper horizontal - mobile uniquement */}
              <div className="mt-8 lg:hidden">
                <StepperHorizontal />
              </div>

              {/* CTA */}
              <div
                className="animate-hero-in mt-8 flex justify-center lg:justify-start lg:mt-10"
                style={{ animationDelay: "200ms" }}
              >
                <Suspense fallback={<CTAFallback />}>
                  <CTAButton />
                </Suspense>
              </div>

              {/* 3 réassurances */}
              <div
                className="animate-fade-in mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 lg:justify-start"
                style={{ animationDelay: "350ms" }}
              >
                <span className="flex items-center gap-1.5 text-sm text-[#807778]">
                  <CheckIcon size={15} className="text-[#2DA131]" />
                  Gratuit
                </span>
                <span className="text-[#DBD6CD]" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5 text-sm text-[#807778]">
                  <ClockIcon size={15} className="text-[#807778]" />
                  2&nbsp;minutes
                </span>
                <span className="text-[#DBD6CD]" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5 text-sm text-[#807778]">
                  <LockIcon size={15} className="text-[#9C9494]" />
                  Aucune donnée collectée
                </span>
              </div>

            </div>

            {/* ── Colonne droite (2/5) - stepper vertical desktop ───── */}
            <div className="hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-center">
              <StepperVertical />
            </div>

          </div>
        </div>
      </section>

      {/* ── Urgence - mobile uniquement ─────────────────────────────── */}
      <section className="px-5 pb-6 lg:hidden sm:px-8">
        <div className="mx-auto max-w-xl">
          <UrgenceBox />
        </div>
      </section>

    </div>
  );
}

// ─── Stepper horizontal (mobile) ──────────────────────────────────────────────

function StepperHorizontal() {
  return (
    <div className="relative flex items-start justify-between">
      {/* Ligne pointillée de fond au niveau des cercles (top = h-8/2 = 16px) */}
      <div
        className="absolute border-t-2 border-dashed border-[#DBD6CD]"
        style={{ top: "16px", left: "16px", right: "16px" }}
        aria-hidden="true"
      />
      {STEPS.map((step, i) => (
        <div
          key={step.num}
          className="relative flex flex-1 flex-col items-center gap-2 animate-fade-in"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          {/* Cercle avec fond pour masquer la ligne derrière */}
          <div
            className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step.active
                ? "bg-[#006E90] text-white"
                : "bg-[#F0EAE5] text-[#9C9494]"
            }`}
          >
            {step.num}
          </div>
          <span
            className={`text-center text-xs font-medium leading-tight ${
              step.active ? "text-[#006E90]" : "text-[#9C9494]"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stepper vertical (desktop) ───────────────────────────────────────────────

function StepperVertical() {
  return (
    <div className="rounded-2xl border border-[#DBD6CD] bg-white p-8 shadow-sm">
      <p className="mb-7 text-xs font-semibold uppercase tracking-widest text-[#9C9494]">
        Votre parcours en 3 étapes
      </p>
      <div className="flex flex-col">
        {STEPS.map((step, i) => (
          <div key={step.num}>
            <div
              className="flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${i * 150 + 200}ms` }}
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  step.active
                    ? "bg-[#006E90] text-white shadow-md"
                    : "bg-[#F0EAE5] text-[#9C9494]"
                }`}
              >
                {step.num}
              </div>
              <p
                className={`text-base font-semibold ${
                  step.active ? "text-[#006E90]" : "text-[#554F4F]"
                }`}
              >
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="ml-6 h-8 border-l-2 border-dashed border-[#DBD6CD]"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Encadré urgence (réutilisé mobile + desktop) ─────────────────────────────

function UrgenceBox() {
  return (
    <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex gap-3.5 rounded-xl border-l-[3px] border-[#494343] bg-[#F9F5F2] px-5 py-4">
        <AlertIcon size={20} className="mt-0.5 flex-shrink-0 text-[#554F4F]" />
        <div className="text-sm leading-relaxed text-[#686162]">
          <p className="font-semibold text-[#3F3B3C]">
            L&apos;obligation est en vigueur depuis le 1er&nbsp;janvier&nbsp;2023.
          </p>
          <p className="mt-1">
            2026 est probablement la dernière année de financement ANDPC sans avance
            de frais. En 2025, les budgets ont été épuisés dès septembre.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Fallback CTA ─────────────────────────────────────────────────────────────

function CTAFallback() {
  return (
    <div className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#006E90] px-8 text-lg font-semibold text-white opacity-90 sm:w-auto sm:min-w-[340px]">
      Commencer mon diagnostic gratuit
      <ArrowRightIcon size={20} />
    </div>
  );
}
