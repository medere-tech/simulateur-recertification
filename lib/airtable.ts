// Client Airtable - catalogue des formations Médéré
// Base : app3GnMOzJn7VHMji

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
  blocAxe:        string[] | null; // ["1"] | ["1", "2"] | etc.
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

// Noms de champs lisibles — utilisés comme clés alternatives si Airtable
// retourne les données par nom plutôt que par ID.
const FIELD_NAMES = {
  titre:         "Nom de la formation",
  duree:         "Durée totale",
  format:        "Format",
  url:           "URL Webflow",
  indemnisation: "Indemnisation",
  professions:   "Public concerné",
  statut:        "Statut de la formation",
  blocAxe:       "Bloc/Axe certification",
  numeroDPC:     "Numéro DPC",
} as const;

function parseRecord(record: AirtableRecord): Formation {
  const f = record.fields;

  // Airtable peut retourner les champs avec comme clé soit le field ID,
  // soit le nom du champ selon comment l'appel est construit.
  // On essaie d'abord par ID, puis par nom (fallback robuste).
  function field<K extends keyof typeof FIELD_IDS>(key: K): unknown {
    return f[FIELD_IDS[key]] ?? f[FIELD_NAMES[key as keyof typeof FIELD_NAMES]];
  }

  // Helpers pour les types Airtable
  type SelectObj = { id: string; name: string; color?: string };
  type SelectItem = string | SelectObj;

  const extractName = (item: SelectItem): string =>
    typeof item === "string" ? item : item.name;

  // singleSelect peut arriver comme objet {id, name, color} ou string directement
  const extractSingle = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "object" && val !== null && "name" in val)
      return (val as SelectObj).name;
    return String(val);
  };

  // Professions : multipleSelects → labels Airtable → IDs app (MG, CD…)
  const rawProfessions = field("professions");
  const professionLabels: string[] = Array.isArray(rawProfessions)
    ? (rawProfessions as SelectItem[]).map(extractName)
    : [];
  const professions = professionLabels
    .map((label) => AIRTABLE_PROFESSION_REVERSE[label] ?? null)
    .filter((id): id is string => id !== null);

  // Bloc/Axe : multipleSelects → chiffres ["1", "2"]
  const blocAxeRaw = field("blocAxe");
  let blocAxe: string[] | null = null;
  if (Array.isArray(blocAxeRaw) && blocAxeRaw.length > 0) {
    const digits = (blocAxeRaw as SelectItem[])
      .map(extractName)
      .map((v) => String(v).replace(/\D/g, ""))
      .filter(Boolean);
    blocAxe = digits.length > 0 ? digits : null;
  } else if (blocAxeRaw) {
    const digit = extractSingle(blocAxeRaw).replace(/\D/g, "");
    blocAxe = digit ? [digit] : null;
  }

  return {
    id:            record.id,
    titre:         String(field("titre")        ?? ""),
    numeroDPC:     String(field("numeroDPC")    ?? ""),
    duree:         String(field("duree")        ?? ""),
    format:        extractSingle(field("format")),   // singleSelect → objet possible
    url:           String(field("url")          ?? ""),
    indemnisation: typeof field("indemnisation") === "number"
                     ? field("indemnisation") as number
                     : null,
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

  // Log diagnostic : voir les clés exactes retournées par Airtable
  if (allRecords.length > 0) {
    console.log("[AIRTABLE] Raw record[0] keys:", Object.keys(allRecords[0]?.fields || {}));
    console.log("[AIRTABLE] Raw record[0] fields:", JSON.stringify(allRecords[0]?.fields, null, 2).substring(0, 1000));
  }

  return allRecords.map(parseRecord);
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Formations éligibles pour une profession - blocs/axes 1 & 2 uniquement,
 * statut "Active". Retourne [] si Airtable non configuré.
 *
 * Stratégie : filtre UNIQUEMENT sur le statut côté Airtable (FIND/ARRAYJOIN
 * sur multipleSelects est peu fiable avec l'API REST). Profession et bloc
 * sont filtrés côté code après parsing.
 */
export async function getFormationsByProfession(professionId: string): Promise<Formation[]> {
  const airtableLabel = AIRTABLE_PROFESSION_MAP[professionId];
  if (!airtableLabel) {
    console.warn(`[AIRTABLE] Profession inconnue : "${professionId}"`);
    return [];
  }

  // Seul filtre serveur : statut = Active (évite FIND/ARRAYJOIN sur multipleSelects)
  const formula = `{${COL.statut}} = "Active"`;
  const allActive = await fetchFormations(formula);

  console.log(`[AIRTABLE] Total formations actives récupérées : ${allActive.length}`);
  console.log(`[AIRTABLE] Filtre profession : "${airtableLabel}" (code: ${professionId})`);

  if (allActive.length > 0) {
    console.log(`[AIRTABLE] Sample record[0] professions:`, allActive[0].professions);
    console.log(`[AIRTABLE] Sample record[0] blocAxe:`, allActive[0].blocAxe);
  }

  // Filtre côté code : profession + blocs 1, 2, 3 ou 4
  const filtered = allActive.filter((f) => {
    const matchProfession = f.professions.includes(professionId);
    const matchBloc = f.blocAxe?.some((b) => ["1", "2", "3", "4"].includes(b));
    return matchProfession && matchBloc;
  });

  console.log(`[AIRTABLE] Après filtrage profession+bloc : ${filtered.length} formations`);

  return filtered;
}

/**
 * Tout le catalogue actif - blocs 1 & 2 uniquement.
 * Utile pour un éventuel cache global ou pré-chargement PDF.
 */
export async function getAllFormations(): Promise<Formation[]> {
  // Filtre serveur : statut uniquement. Filtrage par bloc côté code (cf. getFormationsByProfession).
  const formula = `{${COL.statut}} = "Active"`;

  const formations = await fetchFormations(formula);
  return formations.filter((f) => f.blocAxe?.some((b) => ["1", "2", "3", "4"].includes(b)));
}

// Nettoie le titre en supprimant les suffixes de format et "Programme intégré"
// afin de comparer des sujets identiques déclinés en plusieurs formats.
// Ex: "Repérer et agir..., Programme intégré (Classe virtuelle)" → "Repérer et agir..."
function extractBaseName(titre: string): string {
  return titre
    .replace(/\s*\(E-[Ll]earning\)\s*$/, "")
    .replace(/\s*\(Classe virtuelle\)\s*$/, "")
    .replace(/\s*\(Présentiel\)\s*$/, "")
    .replace(/,?\s*Programme intégré\s*$/, "")
    .trim();
}

/**
 * Sélectionne les formations à afficher dans le PDF selon les statuts des blocs.
 * - "valide" (2/2) → 0 formation pour ce bloc
 * - "en_cours" (1/2) → 1 formation max
 * - "a_faire" (0/2) → 2 formations max, sujets et formats diversifiés
 *
 * Retourne un tableau structuré par bloc (max 8 formations au total).
 * La déduplication se fait par baseName : un sujet sélectionné pour un bloc
 * ne sera pas proposé à nouveau pour les blocs suivants.
 */
export function selectFormationsForReport(
  allFormations: Formation[],
  bloc1Status: string,
  bloc2Status: string,
  bloc3Status: string,
  bloc4Status: string,
): { bloc: string; formations: Formation[] }[] {
  const result: { bloc: string; formations: Formation[] }[] = [];
  // Sujets déjà utilisés (partagé entre tous les blocs)
  const usedBaseNames = new Set<string>();

  // Combien de formations par bloc selon le statut
  function maxForBloc(status: string): number {
    if (status === "valide")   return 0;
    if (status === "en_cours") return 1;
    return 2; // a_faire
  }

  const FORMAT_ORDER = ["E-Learning", "Classe virtuelle", "Présentiel"];

  function bestVariant(variants: Formation[], preferDifferentFrom?: string): Formation {
    return [...variants].sort((a, b) => {
      // Si un format préféré est exclu, mettre les formats différents en premier
      if (preferDifferentFrom) {
        const aDiff = a.format !== preferDifferentFrom ? 0 : 1;
        const bDiff = b.format !== preferDifferentFrom ? 0 : 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
      }
      const aIdx = FORMAT_ORDER.indexOf(a.format) === -1 ? 99 : FORMAT_ORDER.indexOf(a.format);
      const bIdx = FORMAT_ORDER.indexOf(b.format) === -1 ? 99 : FORMAT_ORDER.indexOf(b.format);
      return aIdx - bIdx;
    })[0];
  }

  // Sélectionner les formations pour UN bloc
  function selectForBloc(blocNumber: string, max: number): Formation[] {
    if (max === 0) return [];

    // Candidats : formations qui couvrent ce bloc ET dont le sujet n'est pas déjà utilisé
    const candidates = allFormations.filter((f) =>
      f.blocAxe?.includes(blocNumber) &&
      !usedBaseNames.has(extractBaseName(f.titre))
    );

    if (candidates.length === 0) {
      console.log(`[SELECT] Bloc ${blocNumber} - max: ${max} - unique subjects: 0 - selected: []`);
      return [];
    }

    // Grouper par baseName → un "sujet" avec ses variantes de format
    const grouped = new Map<string, Formation[]>();
    for (const f of candidates) {
      const base = extractBaseName(f.titre);
      if (!grouped.has(base)) grouped.set(base, []);
      grouped.get(base)!.push(f);
    }

    const uniqueSubjects = Array.from(grouped.entries());
    const selected: Formation[] = [];

    // ÉTAPE 1 : Premier sujet → meilleur format (E-Learning prioritaire)
    const [baseName1, variants1] = uniqueSubjects[0];
    const pick1 = bestVariant(variants1);
    selected.push(pick1);
    usedBaseNames.add(baseName1);

    // ÉTAPE 2 : Deuxième sujet DIFFÉRENT → format différent si possible
    if (max >= 2 && uniqueSubjects.length > 1) {
      const firstFormat = pick1.format;
      let secondSubject: [string, Formation[]] | undefined;

      // Priorité 1 : sujet différent qui dispose d'une variante de format différent
      for (let i = 1; i < uniqueSubjects.length; i++) {
        const [bn, vars] = uniqueSubjects[i];
        if (usedBaseNames.has(bn)) continue;
        if (vars.some((v) => v.format !== firstFormat)) {
          secondSubject = [bn, vars];
          break;
        }
      }

      // Priorité 2 : n'importe quel sujet différent
      if (!secondSubject) {
        for (let i = 1; i < uniqueSubjects.length; i++) {
          const [bn, vars] = uniqueSubjects[i];
          if (!usedBaseNames.has(bn)) {
            secondSubject = [bn, vars];
            break;
          }
        }
      }

      if (secondSubject) {
        const [baseName2, variants2] = secondSubject;
        const pick2 = bestVariant(variants2, firstFormat);
        selected.push(pick2);
        usedBaseNames.add(baseName2);
      }
    }

    console.log(`[SELECT] Bloc ${blocNumber} - max: ${max} - unique subjects: ${uniqueSubjects.length} - selected:`, selected.map((f) => `${f.titre} | ${f.format}`));

    return selected;
  }

  // Traiter les blocs dans l'ordre
  const blocs = [
    { number: "1", status: bloc1Status },
    { number: "2", status: bloc2Status },
    { number: "3", status: bloc3Status },
    { number: "4", status: bloc4Status },
  ];

  for (const bloc of blocs) {
    const max = maxForBloc(bloc.status);
    const formations = selectForBloc(bloc.number, max);
    if (formations.length > 0) {
      result.push({ bloc: bloc.number, formations });
    }
  }

  return result;
}
