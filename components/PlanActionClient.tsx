"use client";

// Écrans 7 & 8 — Plan d'action (capture email) + Confirmation
// Lit les params URL, calcule le score, affiche le bon écran

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROFESSIONS, ProfessionId } from "@/lib/professions";
import { calculateScore, DpcFormations, DiplomaYear } from "@/lib/scoring";
import { GA4 } from "@/lib/ga4";
import SiteHeader from "@/components/SiteHeader";
import LeadForm from "@/components/LeadForm";
import RdvModal from "@/components/RdvModal";
import { CheckIcon, ArrowRightIcon } from "@/components/icons";

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PlanActionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const profession   = searchParams.get("profession")   as ProfessionId | null;
  const diplomaYear  = searchParams.get("diplomaYear")  as DiplomaYear  | null;
  const dpcFormations = searchParams.get("dpcFormations") as DpcFormations | null;
  const awareness    = searchParams.get("awareness")    ?? "";
  const confirmed    = searchParams.get("confirmed")    === "true";

  const isValid =
    !!profession && !!diplomaYear && !!dpcFormations && profession in PROFESSIONS;

  const result = isValid
    ? calculateScore(profession!, diplomaYear!, dpcFormations!)
    : null;

  useEffect(() => {
    if (!isValid || !result) {
      router.replace("/simulateur?step=1");
    }
  }, [isValid]);

  if (!isValid || !result) return null;

  // ── Config profession ──────────────────────────────────────────────────────

  const profConfig    = PROFESSIONS[profession!];
  const accentColor   = profConfig.color;
  const textOnAccent  = profConfig.textOnColor ?? "#FFFFFF";
  const dimensionLabel = profConfig.dimensionLabel;
  const dimensionLabelPlural = profConfig.dimensionLabelPlural;
  const { totalScore, urgency, bloc1Status, bloc2Status } = result;

  // Query string transmis au formulaire pour construire l'URL confirmed
  const planParams = new URLSearchParams({
    profession: profession!,
    diplomaYear: diplomaYear!,
    dpcFormations: dpcFormations!,
    ...(awareness ? { awareness } : {}),
  }).toString();

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">
      <SiteHeader />

      {/* Bandeau profession */}
      <div className="px-4 py-3 text-center" style={{ backgroundColor: accentColor }}>
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: textOnAccent, opacity: 0.85 }}
        >
          Votre plan d&apos;action personnalisé
        </p>
        <p className="mt-0.5 text-base font-bold" style={{ color: textOnAccent }}>
          {profConfig.label}
        </p>
      </div>

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-lg animate-fade-in">
          {confirmed ? (
            <Ecran8
              profConfig={profConfig}
              accentColor={accentColor}
              textOnAccent={textOnAccent}
              profession={profession!}
              score={totalScore}
            />
          ) : (
            <Ecran7
              profConfig={profConfig}
              accentColor={accentColor}
              textOnAccent={textOnAccent}
              profession={profession!}
              score={totalScore}
              urgency={urgency}
              bloc1Status={bloc1Status}
              bloc2Status={bloc2Status}
              diplomaYear={diplomaYear!}
              dpcFormations={dpcFormations!}
              awareness={awareness}
              dimensionLabel={dimensionLabel}
              dimensionLabelPlural={dimensionLabelPlural}
              planParams={planParams}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Écran 7 — Formulaire ─────────────────────────────────────────────────────

// Trick TS : PROFESSIONS values type
type ProfConfig = (typeof PROFESSIONS)[ProfessionId];

function Ecran7({
  profConfig,
  accentColor,
  textOnAccent,
  profession,
  score,
  urgency,
  bloc1Status,
  bloc2Status,
  diplomaYear,
  dpcFormations,
  awareness,
  dimensionLabel,
  dimensionLabelPlural,
  planParams,
}: {
  profConfig: ProfConfig;
  accentColor: string;
  textOnAccent: string;
  profession: string;
  score: number;
  urgency: string;
  bloc1Status: string;
  bloc2Status: string;
  diplomaYear: string;
  dpcFormations: string;
  awareness: string;
  dimensionLabel: "Bloc" | "Axe";
  dimensionLabelPlural: "Blocs" | "Axes";
  planParams: string;
}) {
  const benefits = [
    `Votre diagnostic détaillé par ${dimensionLabel.toLowerCase()} avec les actions à réaliser`,
    `Les formations Médéré éligibles à votre certification (${dimensionLabelPlural} 1 & 2)`,
    "Un calendrier recommandé avant la fermeture du financement ANDPC",
    "Les prochaines dates de sessions disponibles",
  ];

  return (
    <div className="space-y-6">

      {/* Titre */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#302D2D]">
          Recevez votre plan d&apos;action personnalisé
        </h1>
        <p className="mt-2 text-sm text-[#686162]">
          Un rapport détaillé adapté à votre profil de{" "}
          <span className="font-semibold text-[#302D2D]">{profConfig.label.toLowerCase()}</span>
        </p>
      </div>

      {/* Liste des bénéfices */}
      <div className="rounded-xl border border-[#DBD6CD] bg-white px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#9C9494]">
          Ce que contient votre rapport
        </p>
        <ul className="space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <CheckIcon
                size={16}
                className="mt-0.5 flex-shrink-0 text-[#2DA131]"
              />
              <span className="text-sm leading-snug text-[#554F4F]">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulaire */}
      <div className="rounded-xl border border-[#DBD6CD] bg-white px-4 py-5">
        <LeadForm
          profession={profession}
          score={score}
          urgency={urgency}
          bloc1Status={bloc1Status}
          bloc2Status={bloc2Status}
          diplomaYear={diplomaYear}
          dpcFormations={dpcFormations}
          awareness={awareness}
          accentColor={accentColor}
          textOnAccent={textOnAccent}
          planParams={planParams}
        />
      </div>

    </div>
  );
}

// ─── Écran 8 — Confirmation ───────────────────────────────────────────────────

function Ecran8({
  profConfig,
  accentColor,
  textOnAccent,
  profession,
  score,
}: {
  profConfig: ProfConfig;
  accentColor: string;
  textOnAccent: string;
  profession: string;
  score: number;
}) {
  const [rdvOpen, setRdvOpen] = useState(false);

  function openRdv() {
    GA4.rdvClicked(profession, score);
    setRdvOpen(true);
  }

  return (
    <>
      <div className="space-y-6 text-center animate-fade-in">

        {/* Icône succès */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCFCE7]">
            <CheckIcon size={48} className="text-[#2DA131]" />
          </div>
          <h1 className="text-2xl font-bold text-[#302D2D]">
            Votre plan d&apos;action est en route&nbsp;!
          </h1>
          <p className="text-sm leading-relaxed text-[#686162]">
            Consultez votre boîte mail dans les prochaines minutes.{" "}
            Si vous ne le trouvez pas, vérifiez vos spams.
          </p>
        </div>

        {/* Aperçu contenu */}
        <div className="rounded-xl border border-[#DBD6CD] bg-white px-4 py-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#9C9494]">
            Vous recevrez
          </p>
          <p className="text-sm leading-relaxed text-[#554F4F]">
            Un rapport PDF personnalisé avec votre diagnostic complet, les formations
            recommandées pour votre certification{" "}
            <span className="font-semibold text-[#302D2D]">{profConfig.label.toLowerCase()}</span>,
            et un calendrier d&apos;actions avant la fermeture du financement ANDPC.
          </p>
        </div>

        {/* CTA RDV */}
        <div className="rounded-xl border border-[#DBD6CD] bg-white px-4 py-5">
          <p className="text-sm text-[#554F4F]">
            Vous souhaitez être accompagné(e)&nbsp;?{" "}
            <span className="font-semibold text-[#302D2D]">
              Prenez rendez-vous gratuitement avec un conseiller Médéré.
            </span>
          </p>
          <button
            onClick={openRdv}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 px-6 py-3.5 text-base font-semibold transition-all duration-150 hover:opacity-80 active:scale-[0.98]"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            Prendre rendez-vous
            <ArrowRightIcon size={18} />
          </button>
        </div>

        {/* Citation confiance */}
        <blockquote className="rounded-xl border border-[#F0EAE5] bg-white px-4 py-4">
          <p className="text-sm italic leading-relaxed text-[#686162]">
            &laquo;&nbsp;Médéré est le seul organisme de formation fondé et dirigé par
            un médecin, le Dr Harry Sitbon, qui ne vend que des formations conformes
            aux référentiels officiels de certification périodique.&nbsp;&raquo;
          </p>
        </blockquote>

      </div>

      {/* Modal RDV */}
      <RdvModal isOpen={rdvOpen} onClose={() => setRdvOpen(false)} />
    </>
  );
}
