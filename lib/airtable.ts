// Client Airtable - catalogue des formations Médéré
// Base : app3GnMOzJn7VHMji
// Médéré ne vend PAS les blocs/axes 3 & 4 → filtre strict

import { CONFIG } from "@/lib/config";

// ─── IDs Airtable ─────────────────────────────────────────────────────────────

const BASE_ID    = "app3GnMOzJn7VHMji";
const TABLE_FORMATIONS = "tblu6nfUIhTQ1cbgk";
const TABLE_SESSIONS   = "tblGVEqH7KCo2GlXz";

// Field IDs (pour le paramètre "fields[]" - sélection des colonnes)
const FIELD_IDS = {
  titre:          "fldo62rbDD2trd7Jg",
  duree:          "fldSNZuA8JL91b3wA",
  format:         "fldhfMBFvr9PoB70E",
  url:            "fld9C15oF7RVDEVyO",
  indemnisation:  "fldx61z8Mjr6ezyg8",
  professions:    "fld8TIxjDWBvTvTvX",
  statut:         "fld3NuuufLPPf3LgZ",
  sessions:       "fldLoGqGNJH5VBkpN",
  blocAxe:        "fldSzpTM9bOG4pp66",
  numeroDPC:      "fldpQPNVftoz4y8Ws",
} as const;

// Noms de colonnes lisibles (pour filterByFormula - la syntaxe Airtable l'exige)
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
    indemnisation: typeof f[FIELD_IDS.indemnisation] === "number" ? f[FIELD_IDS.indemnisation] as number : null,
    blocAxe,
    professions,
  };
}

// Paramètre fields[] - ne récupérer que les colonnes utiles
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

  // Airtable pagine à 100 enregistrements - boucle sur les pages
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
 * Formations éligibles pour une profession - blocs/axes 1 & 2 uniquement,
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
 * Tout le catalogue actif - blocs 1 & 2 uniquement.
 * Utile pour un éventuel cache global ou pré-chargement PDF.
 */
export async function getAllFormations(): Promise<Formation[]> {
  const formula = `AND(`
    + `OR({${COL.blocAxe}} = "1", {${COL.blocAxe}} = "2"),`
    + `{${COL.statut}} = "Active"`
    + `)`;

  return fetchFormations(formula);
}

/**
 * Sélectionne les formations à afficher dans le PDF selon les statuts des blocs.
 * - "valide" (2/2) → 0 formation pour ce bloc
 * - "en_cours" (1/2) → 1 formation max
 * - "a_faire" (0/2) → 2 formations max, formats diversifiés
 * Bloc 3 : géré en dur dans le template (Gestion de l'agressivité).
 * Bloc 4 : pas de formation Médéré disponible.
 */
export function selectFormationsForReport(
  allFormations: Formation[],
  bloc1Status: string,
  bloc2Status: string,
  bloc3Status: string,
  _bloc4Status: string,
): Formation[] {
  function countNeeded(status: string): number {
    if (status === "valide")   return 0;
    if (status === "en_cours") return 1;
    return 2; // a_faire
  }

  function pickForBloc(pool: Formation[], count: number): Formation[] {
    if (count === 0 || pool.length === 0) return [];
    if (count === 1) return [pool[0]];

    // Diversifier : 1ère E-Learning, 2ème format différent
    const elearning = pool.filter((f) => f.format === "E-Learning");
    const other     = pool.filter((f) => f.format !== "E-Learning");

    if (elearning.length > 0 && other.length > 0) {
      return [elearning[0], other[0]];
    }
    return pool.slice(0, 2);
  }

  const result: Formation[] = [];

  result.push(...pickForBloc(allFormations.filter((f) => f.blocAxe === "1"), countNeeded(bloc1Status)));
  result.push(...pickForBloc(allFormations.filter((f) => f.blocAxe === "2"), countNeeded(bloc2Status)));

  // Bloc 3 : mention "Gestion de l'agressivité" déjà codée en dur dans le template
  // Ne rien ajouter ici pour éviter la duplication.

  // Bloc 4 : pas encore de catalogue Médéré — ignoré

  void bloc3Status; // utilisé indirectement via le template

  return result;
}
