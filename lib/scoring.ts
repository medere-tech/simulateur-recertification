// Logique de calcul du score par profession
// Source : specs-techniques.md + parcours-utilisateur.md

import type { ProfessionId } from "./professions";

export type DpcFormations = "3_plus" | "1_ou_2" | "aucune" | "ne_sait_pas";
export type EppActions    = "2_plus" | "1" | "aucune" | "ne_sait_pas";
export type DiplomaYear   = "avant_2000" | "2000_2010" | "2011_2022" | "apres_2023";
export type Urgency       = "rouge" | "orange" | "vert";
export type DimensionStatus = "valide" | "en_cours" | "a_faire";

export type ScoreResult = {
  bloc1: number;
  bloc2: number;
  bloc3: number; // Toujours 0
  bloc4: number; // Toujours 0
  totalScore: number;
  maxScore: number;
  echeance: number;
  urgency: Urgency;
  bloc1Status: DimensionStatus;
  bloc2Status: DimensionStatus;
};

// Bloc 1 — basé sur les formations DPC (Q3)
const DPC_TO_BLOC1: Record<DpcFormations, number> = {
  "3_plus":      2,
  "1_ou_2":      1,
  "aucune":      0,
  "ne_sait_pas": 0,
};

// Bloc 2 — basé sur les actions EPP (Q4)
const EPP_TO_BLOC2: Record<EppActions, number> = {
  "2_plus":      2,
  "1":           1,
  "aucune":      0,
  "ne_sait_pas": 0,
};

function toStatus(score: number, max: number): DimensionStatus {
  if (score >= max) return "valide";
  if (score > 0)    return "en_cours";
  return "a_faire";
}

function getEcheance(profession: ProfessionId, diplomaYear: DiplomaYear): number {
  // MG et CD diplômés AVANT 2023 → cycle 9 ans → 2032
  // Toutes les autres combinaisons → 2028
  if ((profession === "MG" || profession === "CD") && diplomaYear !== "apres_2023") {
    return 2032;
  }
  return 2028;
}

export function calculateScore(
  profession: ProfessionId,
  diplomaYear: DiplomaYear,
  dpcFormations: DpcFormations,
  eppActions: EppActions = "aucune"
): ScoreResult {
  const bloc1 = DPC_TO_BLOC1[dpcFormations];
  const bloc2 = EPP_TO_BLOC2[eppActions];
  const bloc3 = 0; // Nouveau — Médéré propose 1 formation (Gestion de l'agressivité)
  const bloc4 = 0; // Nouveau — hors catalogue

  const totalScore = bloc1 + bloc2 + bloc3 + bloc4;
  const maxScore   = 8;
  const echeance   = getEcheance(profession, diplomaYear);

  const urgency: Urgency =
    totalScore <= 2 ? "rouge" : totalScore <= 4 ? "orange" : "vert";

  return {
    bloc1,
    bloc2,
    bloc3,
    bloc4,
    totalScore,
    maxScore,
    echeance,
    urgency,
    bloc1Status: toStatus(bloc1, 2),
    bloc2Status: toStatus(bloc2, 2),
  };
}
