// Logique de calcul du score par profession
// Source : specs-techniques.md + parcours-utilisateur.md

import type { ProfessionId } from "./professions";

export type DpcFormations = "3_plus" | "1_ou_2" | "aucune" | "ne_sait_pas";
export type DiplomaYear = "avant_2000" | "2000_2010" | "2011_2022" | "apres_2023";
export type Urgency = "rouge" | "orange" | "vert";
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

// Actions brutes selon formations DPC déclarées
const DPC_TO_ACTIONS: Record<DpcFormations, number> = {
  "3_plus": 4,
  "1_ou_2": 2,
  "aucune": 0,
  "ne_sait_pas": 1,
};

function toStatus(score: number, max: number): DimensionStatus {
  if (score >= max) return "valide";
  if (score > 0) return "en_cours";
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
  dpcFormations: DpcFormations
): ScoreResult {
  const rawActions = DPC_TO_ACTIONS[dpcFormations];

  let actions: number;
  if (profession === "PED") {
    // Pédiatrie : 2 DPC = 1 action de certification
    actions = Math.floor(rawActions / 2);
  } else {
    actions = rawActions;
  }

  // RÈGLE FONDAMENTALE : Blocs/Axes 3 & 4 = TOUJOURS 0
  const bloc1 = Math.min(actions, 2);
  const bloc2 = Math.max(Math.min(actions - 2, 2), 0);
  const bloc3 = 0;
  const bloc4 = 0;

  const totalScore = bloc1 + bloc2 + bloc3 + bloc4;
  const maxScore = 8;
  const echeance = getEcheance(profession, diplomaYear);

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
