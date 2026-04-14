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

/**
 * Sélectionne les formations à afficher dans le PDF selon les statuts des blocs.
 * - "valide" (2/2) → 0 formation pour ce bloc
 * - "en_cours" (1/2) → 1 formation max
 * - "a_faire" (0/2) → 2 formations max, thèmes et formats diversifiés
 *
 * Retourne un tableau structuré par bloc (max 8 formations au total).
 * Une formation déjà sélectionnée pour un bloc ne peut pas être reprise
 * pour un autre bloc (déduplication par titre).
 */
export function selectFormationsForReport(
  allFormations: Formation[],
  bloc1Status: string,
  bloc2Status: string,
  bloc3Status: string,
  bloc4Status: string,
): { bloc: string; formations: Formation[] }[] {
  const result: { bloc: string; formations: Formation[] }[] = [];
  const usedTitres = new Set<string>(); // Déduplication par titre exact
  const usedThemes = new Set<string>(); // Diversité thématique inter-blocs

  // Combien de formations par bloc selon le statut
  function maxForBloc(status: string): number {
    if (status === "valide")   return 0;
    if (status === "en_cours") return 1;
    return 2; // a_faire
  }

  // Extraire un "thème" simplifié du titre pour éviter les doublons thématiques
  // Ex: "Panorama de la vaccination..." → "vaccination"
  function extractTheme(titre: string): string {
    const stopWords = ["de","du","des","la","le","les","en","et",
      "à","au","aux","un","une","pour","par","sur","dans","son",
      "ses","sa","ce","cette","ces","qui","que","dont"];
    const words = titre.toLowerCase()
      .replace(/[,.:;!?()]/g, "")
      .split(/\s+/)
      .filter((w) => !stopWords.includes(w) && w.length > 2);
    return words.slice(0, 3).join(" ");
  }

  // Sélectionner les formations pour UN bloc
  function selectForBloc(blocNumber: string, max: number): Formation[] {
    if (max === 0) return [];

    // Candidats : formations qui couvrent ce bloc ET pas déjà utilisées
    const candidates = allFormations.filter((f) =>
      f.blocAxe?.includes(blocNumber) &&
      !usedTitres.has(f.titre)
    );

    console.log(`[SELECT] Bloc ${blocNumber} - max: ${max} - candidates: ${candidates.length}`);

    if (candidates.length === 0) return [];

    // Trier : E-Learning en premier, puis Classe virtuelle, puis Présentiel
    const formatOrder = ["E-Learning", "Classe virtuelle", "Présentiel"];
    const sorted = [...candidates].sort((a, b) => {
      const aIdx = formatOrder.indexOf(a.format) === -1 ? 99 : formatOrder.indexOf(a.format);
      const bIdx = formatOrder.indexOf(b.format) === -1 ? 99 : formatOrder.indexOf(b.format);
      return aIdx - bIdx;
    });

    const selected: Formation[] = [];

    // ÉTAPE 1 : Prendre la première formation dont le thème n'est pas encore utilisé
    for (const f of sorted) {
      const theme = extractTheme(f.titre);
      if (!usedThemes.has(theme)) {
        selected.push(f);
        usedTitres.add(f.titre);
        usedThemes.add(theme);
        break;
      }
    }

    // Si aucun thème unique trouvé, prendre la première disponible
    if (selected.length === 0 && sorted.length > 0) {
      selected.push(sorted[0]);
      usedTitres.add(sorted[0].titre);
      usedThemes.add(extractTheme(sorted[0].titre));
    }

    // ÉTAPE 2 : Si max >= 2, prendre une deuxième formation
    if (max >= 2 && selected.length === 1) {
      const firstFormat = selected[0].format;

      const remaining = sorted.filter((f) => !usedTitres.has(f.titre));

      // Priorité 1 : format différent + thème différent
      let second = remaining.find((f) =>
        f.format !== firstFormat &&
        !usedThemes.has(extractTheme(f.titre))
      );
      // Priorité 2 : thème différent (même format ok)
      if (!second) {
        second = remaining.find((f) => !usedThemes.has(extractTheme(f.titre)));
      }
      // Priorité 3 : format différent (même thème ok)
      if (!second) {
        second = remaining.find((f) => f.format !== firstFormat);
      }
      // Priorité 4 : n'importe quoi de restant
      if (!second && remaining.length > 0) {
        second = remaining[0];
      }

      if (second) {
        selected.push(second);
        usedTitres.add(second.titre);
        usedThemes.add(extractTheme(second.titre));
      }
    }

    for (const f of selected) {
      console.log(`[SELECT]   → ${f.titre} | ${f.format}`);
    }
    console.log(`[SELECT] Bloc ${blocNumber} - selected: ${selected.length}`);

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
