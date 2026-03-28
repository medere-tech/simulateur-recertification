"use client";

// Écran 6 - Résultat gratuit
// Client component : lit les URL params, calcule le score, fire GA4

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROFESSIONS, ProfessionId } from "@/lib/professions";
import {
  calculateScore,
  DpcFormations,
  EppActions,
  RelationPatient,
  SantePerso,
  DiplomaYear,
} from "@/lib/scoring";
import { GA4 } from "@/lib/ga4";
import ScoreGauge from "@/components/ScoreGauge";
import BlocStatus from "@/components/BlocStatus";
import SiteHeader from "@/components/SiteHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plural(n: number, word: string) {
  return `${n}\u00a0${word}${n > 1 ? "s" : ""}`;
}

function getConstraint(profession: ProfessionId): string | null {
  switch (profession) {
    case "CD":
      return "Toute formation doit avoir une durée minimale de 6\u00a0heures pour être validante.";
    case "PED":
      return "En pédiatrie, 2\u00a0actions DPC comptent pour 1\u00a0action de certification.";
    case "PSY":
      return "Le e-learning Qualiopi est explicitement validant pour l\u2019Axe\u00a01 en psychiatrie.";
    case "MG":
      return "18\u00a0pratiques sont exclues du référentiel MG (homéopathie, ostéopathie\u2026).";
    default:
      return null;
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ResultatClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const profession      = searchParams.get("profession")      as ProfessionId    | null;
  const diplomaYear     = searchParams.get("diplomaYear")     as DiplomaYear     | null;
  const dpcFormations   = searchParams.get("dpcFormations")   as DpcFormations   | null;
  const eppActions      = searchParams.get("eppActions")      as EppActions      | null;
  const relationPatient = searchParams.get("relationPatient") as RelationPatient | null;
  const santePerso      = searchParams.get("santePerso")      as SantePerso      | null;

  const isValid =
    !!profession &&
    !!diplomaYear &&
    !!dpcFormations &&
    !!eppActions &&
    !!relationPatient &&
    !!santePerso &&
    profession in PROFESSIONS;

  // Score calculé uniquement si params valides
  const result = isValid
    ? calculateScore(profession!, diplomaYear!, dpcFormations!, eppActions!, relationPatient!, santePerso!)
    : null;

  // GA4 + redirect (toujours appelé, logique conditionnelle à l'intérieur)
  useEffect(() => {
    if (!isValid || !result) {
      router.replace("/simulateur?step=1");
      return;
    }
    GA4.resultViewed({
      score: result.totalScore,
      profession: profession!,
      urgencyLevel: result.urgency,
      diplomaRange: diplomaYear!,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid]);

  if (!isValid || !result) return null;

  // ── Données ────────────────────────────────────────────────────────────────

  const profConfig = PROFESSIONS[profession!];
  const accentColor = profConfig.color;
  const textOnAccent = profConfig.textOnColor ?? "#FFFFFF";
  const dimensionLabel = profConfig.dimensionLabel;

  const { bloc1, bloc2, bloc3, bloc4, totalScore, maxScore, echeance, urgency,
          bloc1Status, bloc2Status, bloc3Status, bloc4Status } = result;
  const remainingActions = maxScore - totalScore;

  const constraint = getConstraint(profession!);

  // Params transmis au plan d'action
  const planParams = new URLSearchParams({
    profession:      profession!,
    diplomaYear:     diplomaYear!,
    dpcFormations:   dpcFormations!,
    eppActions:      eppActions!,
    relationPatient: relationPatient!,
    santePerso:      santePerso!,
  }).toString();

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">

      {/* ── Header sticky ───────────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Bandeau profession (couleur d'accent) ──────────────────────────── */}
      <div
        className="px-4 py-3 text-center"
        style={{ backgroundColor: accentColor }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: textOnAccent, opacity: 0.8 }}>
          Votre diagnostic certification périodique
        </p>
        <p className="mt-0.5 text-base font-bold" style={{ color: textOnAccent }}>
          {profConfig.label}
        </p>
      </div>

      {/* ── Contenu principal ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-lg animate-fade-in space-y-6">

          {/* Jauge de score */}
          <ScoreGauge score={totalScore} maxScore={maxScore} urgency={urgency} />

          {/* Score textuel */}
          <div className="rounded-xl border border-[#DBD6CD] bg-white px-4 py-4 text-center">
            <p className="text-lg font-bold text-[#302D2D]">
              {totalScore === 0
                ? "Vous n\u2019avez pas encore validé d\u2019action"
                : `Vous avez validé environ ${plural(totalScore, "action")} sur ${maxScore}`}
            </p>
            <p className="mt-1 text-sm text-[#554F4F]">
              Il vous reste{" "}
              <strong className="font-semibold text-[#302D2D]">
                {plural(remainingActions, "action")}
              </strong>{" "}
              à réaliser d&apos;ici{" "}
              <strong className="font-semibold text-[#302D2D]">{echeance}</strong>
            </p>
          </div>

          {/* Les 4 blocs / axes */}
          <section aria-label={`Vos 4 ${profConfig.dimensionLabelPlural.toLowerCase()}`}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#9C9494]">
              Vos 4&nbsp;{profConfig.dimensionLabelPlural.toLowerCase()}
            </h3>
            <div className="space-y-2">
              <BlocStatus
                index={1}
                dimensionLabel={dimensionLabel}
                name={profConfig.dimensions[0].name}
                score={bloc1}
                status={bloc1Status}
                animDelay={0}
              />
              <BlocStatus
                index={2}
                dimensionLabel={dimensionLabel}
                name={profConfig.dimensions[1].name}
                score={bloc2}
                status={bloc2Status}
                animDelay={150}
              />
              <BlocStatus
                index={3}
                dimensionLabel={dimensionLabel}
                name={profConfig.dimensions[2].name}
                score={bloc3}
                status={bloc3Status}
                isNew={bloc3Status === "a_faire"}
                medereNote={bloc3Status === "a_faire" ? "1 formation Médéré disponible" : undefined}
                animDelay={300}
              />
              <BlocStatus
                index={4}
                dimensionLabel={dimensionLabel}
                name={profConfig.dimensions[3].name}
                score={bloc4}
                status={bloc4Status}
                isNew={bloc4Status === "a_faire"}
                animDelay={450}
              />
            </div>
          </section>

          {/* Message estimatif pour "Autre professionnel de santé" */}
          {profession === "AUTRE" && (
            <div className="flex gap-3 rounded-xl border border-[#2DA131] bg-[#F0FDF4] px-4 py-3.5">
              <span className="mt-0.5 flex-shrink-0 text-base" aria-hidden="true">💬</span>
              <p className="text-sm leading-relaxed text-[#14532D]">
                Ce diagnostic est une estimation générale. Contactez Médéré pour
                une analyse personnalisée selon votre référentiel professionnel.
              </p>
            </div>
          )}

          {/* Contrainte spécifique à la profession */}
          {constraint && (
            <div className="flex gap-3 rounded-xl border border-[#DBD6CD] bg-white px-4 py-3.5">
              <span className="mt-0.5 flex-shrink-0 text-base" aria-hidden="true">ℹ️</span>
              <p className="text-sm leading-relaxed text-[#554F4F]">
                <span className="font-semibold">Rappel&nbsp;: </span>
                {constraint}
              </p>
            </div>
          )}

          {/* Encadré urgence ANDPC */}
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-4">
            <p className="text-sm leading-relaxed text-[#7F1D1D]">
              <span
                className="animate-pulse-gentle mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#CC0000] align-middle"
                aria-hidden="true"
              />
              <strong className="font-semibold">
                2026 est probablement la dernière année
              </strong>{" "}
              où vos formations sont prises en charge sans avance de frais via
              l&apos;ANDPC. En 2025, les budgets ont été épuisés dès septembre.
            </p>
          </div>

          {/* CTA */}
          <Link
            href={`/plan-action?${planParams}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] hover:opacity-90"
            style={{ backgroundColor: accentColor, color: textOnAccent }}
          >
            Recevoir mon plan d&apos;action personnalisé
            <span aria-hidden="true">→</span>
          </Link>

        </div>
      </main>

    </div>
  );
}
