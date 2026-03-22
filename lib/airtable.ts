// Client Airtable — catalogue des formations Médéré
// Base : app3GnMOzJn7VHMji
// Médéré ne vend PAS les blocs/axes 3 & 4 → filtre strict

import { CONFIG } from "@/lib/config";

// ─── IDs Airtable ─────────────────────────────────────────────────────────────

const BASE_ID    = "app3GnMOzJn7VHMji";
const TABLE_FORMATIONS = "tblu6nfUIhTQ1cbgk";
const TABLE_SESSIONS   = "tblGVEqH7KCo2GlXz";

// Field IDs (pour le paramètre "fields[]" — sélection des colonnes)
const FIELD_IDS = {
  titre:          "fldo62rbDD2trd7Jg",
  duree:          "fldSNZuA8JL91b3wA",
  format:         "fldhfMBFvr9PoB70E",
  url:            "fld9C15oF7RVDEVyO",
  prix:           "fldJQgWNl3AL0ofSN",
  indemnisation:  "fldx61z8Mjr6ezyg8",
  professions:    "fld8TIxjDWBvTvTvX",
  statut:         "fld3NuuufLPPf3LgZ",
  sessions:       "fldLoGqGNJH5VBkpN",
  blocAxe:        "fldSzpTM9bOG4pp66",
  numeroDPC:      "fldpQPNVftoz4y8Ws",
} as const;

// Noms de colonnes lisibles (pour filterByFormula — la syntaxe Airtable l'exige)
const COL = {
  professions: "Public concerné",
  blocAxe:     "Bloc/Axe certification",
  statut:      "Statut de la formation",
} as const;

// ─── Mapping profession ───────────────────────────────────────────────────────

// ID app → label Airtable (pour construire les filtres)
const AIRTABLE_PROFESSION_MAP: Record<string, string> = {
  MG:    "Médecin généraliste",
  CD:    "Chirurgien dentiste",   // pas de tiret dans Airtable
  GO:    "Gynécologue",
  PED:   "Pédiatre",
  PSY:   "Psychiatre",
  AUTRE: "Autres",
};

// Label Airtable → ID app (pour parser les réponses)
const AIRTABLE_PROFESSION_REVERSE: Record<string, string | null> = {
  "Médecin généraliste": "MG",
  "Chirurgien dentiste": "CD",
  "Gynécologue":          "GO",
  "Pédiatre":             "PED",
  "Psychiatre":           "PSY",
  "Radiologue":           null,   // hors périmètre simulateur
  "Autres":               "AUTRE",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type Formation = {
  id:             string;
  titre:          string;
  numeroDPC:      string;
  duree:          string;
  format:         "E-Learning" | "Classe virtuelle" | "Présentiel" | "Hybride" | string;
  url:            string;
  prix:           number | null;
  indemnisation:  number | null;
  blocAxe:        string | null; // "1" | "2" | "3" | "4"
  professions:    string[];      // IDs app : ["MG", "PED"]
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(CONFIG.AIRTABLE_API_KEY && BASE_ID);
}

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type AirtableResponse = {
  records: AirtableRecord[];
  offset?: string;
};

function parseRecord(record: AirtableRecord): Formation {
  const f = record.fields;

  // Professions : multi-select → convertir les labels en IDs app
  const rawProfessions = Array.isArray(f[FIELD_IDS.professions])
    ? (f[FIELD_IDS.professions] as string[])
    : [];
  const professions = rawProfessions
    .map((label) => AIRTABLE_PROFESSION_REVERSE[label] ?? null)
    .filter((id): id is string => id !== null);

  // Bloc/Axe : singleSelect, valeur brute ("1", "2", "Bloc 1"…)
  const blocAxeRaw = f[FIELD_IDS.blocAxe];
  const blocAxe = blocAxeRaw ? String(blocAxeRaw).replace(/\D/g, "") || null : null;

  return {
    id:            record.id,
    titre:         String(f[FIELD_IDS.titre]         ?? ""),
    numeroDPC:     String(f[FIELD_IDS.numeroDPC]     ?? ""),
    duree:         String(f[FIELD_IDS.duree]         ?? ""),
    format:        String(f[FIELD_IDS.format]        ?? ""),
    url:           String(f[FIELD_IDS.url]           ?? ""),
    prix:          typeof f[FIELD_IDS.prix]          === "number" ? f[FIELD_IDS.prix] as number : null,
    indemnisation: typeof f[FIELD_IDS.indemnisation] === "number" ? f[FIELD_IDS.indemnisation] as number : null,
    blocAxe,
    professions,
  };
}

// Paramètre fields[] — ne récupérer que les colonnes utiles
const FIELDS_PARAM = Object.values(FIELD_IDS)
  .filter((id) => id !== FIELD_IDS.sessions) // les sessions sont dans une autre table
  .map((id) => `fields[]=${id}`)
  .join("&");

async function fetchFormations(filterFormula: string): Promise<Formation[]> {
  if (!isConfigured()) return [];

  const apiKey = CONFIG.AIRTABLE_API_KEY;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_FORMATIONS}`
    + `?filterByFormula=${encodeURIComponent(filterFormula)}`
    + `&${FIELDS_PARAM}`;

  let allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  // Airtable pagine à 100 enregistrements — boucle sur les pages
  do {
    const pageUrl = offset ? `${url}&offset=${offset}` : url;
    const res = await fetch(pageUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next:    { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error("[airtable] Fetch error:", res.status, await res.text());
      return allRecords.map(parseRecord);
    }

    const data = await res.json() as AirtableResponse;
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
  } while (offset);

  return allRecords.map(parseRecord);
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Formations éligibles pour une profession — blocs/axes 1 & 2 uniquement,
 * statut "Active". Retourne [] si Airtable non configuré.
 */
export async function getFormationsByProfession(professionId: string): Promise<Formation[]> {
  const airtableLabel = AIRTABLE_PROFESSION_MAP[professionId];
  if (!airtableLabel) return [];

  const formula = `AND(`
    + `FIND("${airtableLabel}", ARRAYJOIN({${COL.professions}}, ",")),`
    + `OR({${COL.blocAxe}} = "1", {${COL.blocAxe}} = "2"),`
    + `{${COL.statut}} = "Active"`
    + `)`;

  return fetchFormations(formula);
}

/**
 * Tout le catalogue actif — blocs 1 & 2 uniquement.
 * Utile pour un éventuel cache global ou pré-chargement PDF.
 */
export async function getAllFormations(): Promise<Formation[]> {
  const formula = `AND(`
    + `OR({${COL.blocAxe}} = "1", {${COL.blocAxe}} = "2"),`
    + `{${COL.statut}} = "Active"`
    + `)`;

  return fetchFormations(formula);
}
