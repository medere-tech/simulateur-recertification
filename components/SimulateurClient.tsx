"use client";

// State machine du simulateur - 6 questions (2 contexte + 4 scoring)
// Navigation : URL params portent tout l'état (shareable, browser back fonctionnel)
// Couleur d'accent : dynamique selon la profession dès l'étape 2

import { useRouter, useSearchParams } from "next/navigation";
import { PROFESSIONS, ProfessionId } from "@/lib/professions";
import { GA4 } from "@/lib/ga4";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard, { ProfessionGrid } from "@/components/QuestionCard";
import SiteHeader from "@/components/SiteHeader";
import { ChevronLeftIcon } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiplomaYear    = "avant_2000" | "2000_2010" | "2011_2022" | "apres_2023";
type DpcFormations  = "3_plus" | "1_ou_2" | "aucune" | "ne_sait_pas";
type EppActions     = "2_plus" | "1" | "aucune" | "ne_sait_pas";
type RelationPatient = "2_plus" | "1" | "aucune" | "ne_sait_pas";
type SantePerso     = "2_plus" | "1" | "aucune" | "ne_sait_pas";

// ─── Données par étape ────────────────────────────────────────────────────────

const PROFESSION_CHOICES = [
  { id: "MG",    label: "Médecin généraliste",         icon: "/images/icon-general.png",      specialtyColor: "#006E90" },
  { id: "CD",    label: "Chirurgien-dentiste",          icon: "/images/icon-dentist.png",      specialtyColor: "#FECA45" },
  { id: "GO",    label: "Gynécologue-Obstétricien",     icon: "/images/icon-gynecologist.png", specialtyColor: "#D87DA9" },
  { id: "PED",   label: "Pédiatre",                    icon: "/images/icon-pediatrician.png", specialtyColor: "#17BEBB" },
  { id: "PSY",   label: "Psychiatre",                  icon: "/images/icon-psychiatrist.png", specialtyColor: "#9F84BD" },
  { id: "AUTRE", label: "Autre médecin spécialiste",   icon: "/images/icon-others.png",       specialtyColor: "#2DA131" },
];

const DIPLOMA_CHOICES = [
  { id: "avant_2000",  label: "Avant 2000" },
  { id: "2000_2010",   label: "2000 – 2010" },
  { id: "2011_2022",   label: "2011 – 2022" },
  { id: "apres_2023",  label: "Après 2023" },
];

const DPC_CHOICES = [
  { id: "3_plus",      label: "Oui, 3 ou plus" },
  { id: "1_ou_2",      label: "Oui, 1 ou 2" },
  { id: "aucune",      label: "Aucune" },
  { id: "ne_sait_pas", label: "Je ne sais pas" },
];

const EPP_CHOICES = [
  { id: "2_plus",      label: "Oui, au moins 2 actions" },
  { id: "1",           label: "Oui, 1 action" },
  { id: "aucune",      label: "Aucune" },
  { id: "ne_sait_pas", label: "Je ne sais pas" },
];

const RELATION_PATIENT_CHOICES = [
  { id: "2_plus",      label: "Oui, 2 actions ou plus" },
  { id: "1",           label: "Oui, 1 action" },
  { id: "aucune",      label: "Aucune" },
  { id: "ne_sait_pas", label: "Je ne sais pas" },
];

const SANTE_PERSO_CHOICES = [
  { id: "2_plus",      label: "Oui, 2 actions ou plus" },
  { id: "1",           label: "Oui, 1 action" },
  { id: "aucune",      label: "Aucune" },
  { id: "ne_sait_pas", label: "Je ne sais pas" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSimulateurUrl(step: number, params: Record<string, string>): string {
  const sp = new URLSearchParams({ step: String(step), ...params });
  return `/simulateur?${sp.toString()}`;
}

function buildResultatUrl(params: Record<string, string>): string {
  return `/resultat?${new URLSearchParams(params).toString()}`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SimulateurClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const step           = Number(searchParams.get("step") ?? "1");
  const profession     = searchParams.get("profession")     as ProfessionId   | null;
  const diplomaYear    = searchParams.get("diplomaYear")    as DiplomaYear    | null;
  const dpcFormations  = searchParams.get("dpcFormations")  as DpcFormations  | null;
  const eppActions     = searchParams.get("eppActions")     as EppActions     | null;
  const relationPatient = searchParams.get("relationPatient") as RelationPatient | null;

  // Validation : si params manquants pour une étape avancée, reset
  if (step >= 2 && !profession) {
    router.replace("/simulateur?step=1");
    return null;
  }
  if (step >= 3 && !diplomaYear) {
    router.replace(buildSimulateurUrl(2, { profession: profession! }));
    return null;
  }
  if (step >= 4 && !dpcFormations) {
    router.replace(buildSimulateurUrl(3, { profession: profession!, diplomaYear: diplomaYear! }));
    return null;
  }
  if (step >= 5 && !eppActions) {
    router.replace(buildSimulateurUrl(4, { profession: profession!, diplomaYear: diplomaYear!, dpcFormations: dpcFormations! }));
    return null;
  }
  if (step >= 6 && !relationPatient) {
    router.replace(buildSimulateurUrl(5, { profession: profession!, diplomaYear: diplomaYear!, dpcFormations: dpcFormations!, eppActions: eppActions! }));
    return null;
  }

  const accentColor = profession ? PROFESSIONS[profession].color : "#006E90";

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleProfession(id: string) {
    GA4.stepCompleted(1, id, "profession");
    router.push(buildSimulateurUrl(2, { profession: id }));
  }

  function handleDiplomaYear(id: string) {
    GA4.stepCompleted(2, id, "diploma_year");
    router.push(buildSimulateurUrl(3, { profession: profession!, diplomaYear: id }));
  }

  function handleDpcFormations(id: string) {
    GA4.stepCompleted(3, id, "dpc_formations");
    router.push(buildSimulateurUrl(4, {
      profession:    profession!,
      diplomaYear:   diplomaYear!,
      dpcFormations: id,
    }));
  }

  function handleEppActions(id: string) {
    GA4.stepCompleted(4, id, "epp_actions");
    router.push(buildSimulateurUrl(5, {
      profession:    profession!,
      diplomaYear:   diplomaYear!,
      dpcFormations: dpcFormations!,
      eppActions:    id,
    }));
  }

  function handleRelationPatient(id: string) {
    GA4.stepCompleted(5, id, "relation_patient");
    router.push(buildSimulateurUrl(6, {
      profession:     profession!,
      diplomaYear:    diplomaYear!,
      dpcFormations:  dpcFormations!,
      eppActions:     eppActions!,
      relationPatient: id,
    }));
  }

  function handleSantePerso(id: string) {
    GA4.stepCompleted(6, id, "sante_perso");
    router.push(buildResultatUrl({
      profession:      profession!,
      diplomaYear:     diplomaYear!,
      dpcFormations:   dpcFormations!,
      eppActions:      eppActions!,
      relationPatient: relationPatient!,
      santePerso:      id,
    }));
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F5F2]">

      {/* ── Header sticky ───────────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Barre de progression ───────────────────────────────────────────── */}
      <div className="bg-white shadow-sm">
        <ProgressBar currentStep={step} totalSteps={6} accentColor={accentColor} />
      </div>

      {/* ── Contenu - key={step} déclenche le fade-in à chaque changement ─── */}
      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        <div key={step} className="w-full max-w-lg animate-fade-in">

          {/* Bouton retour */}
          {step === 1 ? (
            <button
              onClick={() => router.push("/")}
              className="mb-6 flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#807778] transition-colors duration-150 hover:text-[#554F4F]"
            >
              <ChevronLeftIcon size={18} /> Retour
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="mb-6 flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#807778] transition-colors duration-150 hover:text-[#554F4F]"
            >
              <ChevronLeftIcon size={18} /> Retour
            </button>
          )}

          {/* Étape 1 - Profession (grille) */}
          {step === 1 && (
            <ProfessionGrid
              question="Quelle est votre profession ?"
              choices={PROFESSION_CHOICES}
              onSelect={handleProfession}
              note="Ce simulateur couvre les 5 professions dont le référentiel est publié, plus une option générique."
            />
          )}

          {/* Étape 2 - Année de diplôme */}
          {step === 2 && (
            <QuestionCard
              question="En quelle année avez-vous obtenu votre diplôme ?"
              choices={DIPLOMA_CHOICES}
              onSelect={handleDiplomaYear}
              accentColor={accentColor}
              note="Cette information détermine votre échéance de certification."
            />
          )}

          {/* Étape 3 - Formations DPC (Bloc 1) */}
          {step === 3 && (
            <QuestionCard
              question="Combien de formations DPC avez-vous suivies depuis janvier 2023 ?"
              subtitle="E-learning, classes virtuelles, présentiel - hors EPP et analyse de pratiques"
              choices={DPC_CHOICES}
              onSelect={handleDpcFormations}
              accentColor={accentColor}
            />
          )}

          {/* Étape 4 - EPP (Bloc 2) */}
          {step === 4 && (
            <QuestionCard
              question="Avez-vous participé à des actions d'EPP depuis janvier 2023 ?"
              subtitle="Évaluation des pratiques professionnelles : audit clinique, analyse de pratiques, revue de morbi-mortalité, simulation..."
              choices={EPP_CHOICES}
              onSelect={handleEppActions}
              accentColor={accentColor}
            />
          )}

          {/* Étape 5 - Relation patient (Bloc 3) */}
          {step === 5 && (
            <QuestionCard
              question="Avez-vous suivi une formation sur la relation patient ?"
              subtitle="Annonce diagnostique, communication thérapeutique, décision partagée, gestion de l'agressivité..."
              choices={RELATION_PATIENT_CHOICES}
              onSelect={handleRelationPatient}
              accentColor={accentColor}
            />
          )}

          {/* Étape 6 - Santé professionnelle (Bloc 4) */}
          {step === 6 && (
            <QuestionCard
              question="Avez-vous réalisé une action liée à votre santé professionnelle ?"
              subtitle="Burn-out, ergonomie, gestion du stress, qualité de vie au travail, gestion des risques..."
              choices={SANTE_PERSO_CHOICES}
              onSelect={handleSantePerso}
              accentColor={accentColor}
            />
          )}

        </div>
      </main>
    </div>
  );
}
