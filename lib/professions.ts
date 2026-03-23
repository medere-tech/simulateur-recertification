// Configuration par profession - terminologie, couleurs, limites, contraintes
// Source : specs-techniques.md + arrêté du 26 février 2026 - NOR : SFHH2605575A

export type ProfessionId = "MG" | "CD" | "GO" | "PED" | "PSY" | "AUTRE";

export type Dimension = {
  id: number;
  name: string;
  medereCovers: boolean;
};

export type ProfessionConfig = {
  label: string;
  shortLabel: string;
  color: string;
  textOnColor?: string; // Texte sombre si fond clair (ex: CD jaune)
  dimensionLabel: "Bloc" | "Axe";
  dimensionLabelPlural: "Blocs" | "Axes";
  annexe: string;
  cycle: string;
  actionsMin: number;
  actionsParDimension: number;
  cnp: string;
  constraints: {
    durationMin: string | null;
    excludedPractices: boolean;
    dpcAutoValid: boolean;
    dpcAggregation?: string;
    congressAggregation?: string;
    elearningValid?: boolean;
  };
  dimensions: Dimension[];
};

export const PROFESSIONS: Record<ProfessionId, ProfessionConfig> = {
  MG: {
    label: "Médecin généraliste",
    shortLabel: "MG",
    color: "#006E90",
    dimensionLabel: "Bloc",
    dimensionLabelPlural: "Blocs",
    annexe: "Annexe 1",
    cycle: "6 ans (9 ans si diplômé avant 01/01/2023)",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CMG - Collège de la Médecine Générale",
    constraints: {
      durationMin: null,
      excludedPractices: true, // 18 pratiques exclues (homéo, ostéo…)
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle du médecin", medereCovers: false },
    ],
  },
  CD: {
    label: "Chirurgien-dentiste",
    shortLabel: "CD",
    color: "#FECA45",
    textOnColor: "#302D2D",
    dimensionLabel: "Axe",
    dimensionLabelPlural: "Axes",
    annexe: "Annexe 3",
    cycle: "6 ans (9 ans si diplômé avant 01/01/2023)",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP Chirurgiens-dentistes / Ordre national",
    constraints: {
      durationMin: "6h", // TOUTES formations ≥ 6h obligatoire
      excludedPractices: false,
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  GO: {
    label: "Gynécologue-Obstétricien",
    shortLabel: "GO-GM",
    color: "#D87DA9",
    dimensionLabel: "Bloc",
    dimensionLabelPlural: "Blocs",
    annexe: "Annexe 2, spécialité n°16",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP GO-GM - accréditation via GYNERISQ",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  PED: {
    label: "Pédiatre",
    shortLabel: "PED",
    color: "#17BEBB",
    dimensionLabel: "Bloc",
    dimensionLabelPlural: "Blocs",
    annexe: "Annexe 2, spécialité n°35",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP de Pédiatrie",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
      dpcAggregation: "2 DPC = 1 action CP",
      congressAggregation: "3 journées = 1 action",
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      {
        id: 3,
        name: "Relation avec les patients et leurs représentants",
        medereCovers: false,
      },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  PSY: {
    label: "Psychiatre",
    shortLabel: "PSY",
    color: "#9F84BD",
    dimensionLabel: "Axe",
    dimensionLabelPlural: "Axes",
    annexe: "Annexe 2, spécialité n°37",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP de Psychiatrie (CNPP)",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
      elearningValid: true, // E-learning Qualiopi validant pour l'Axe 1
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  AUTRE: {
    label: "Autre professionnel de santé",
    shortLabel: "AUTRE",
    color: "#2DA131",
    dimensionLabel: "Bloc",
    dimensionLabelPlural: "Blocs",
    annexe: "Variable selon profession",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "Selon votre CNP",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
};
