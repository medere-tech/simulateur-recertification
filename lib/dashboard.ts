// Agrégation des données du dashboard - HubSpot (leads simulateur) + Airtable (inscriptions)
// Croise les contacts du simulateur avec la table Inscriptions pour mesurer la conversion.

// ─── IDs Airtable - table Inscriptions ─────────────────────────────────────────

const BASE_ID = "app3GnMOzJn7VHMji";
const TABLE_INSCRIPTIONS = "tblTOJHEwCQhibcMM";

const INSCRIPTION_FIELDS = {
  email:      "fldZmubHrX9S44BUy", // Email
  apprenant:  "fldGiubhYwR32RUPs", // Apprenant
  formation:  "fldPPQhzeUKKa3hND", // Nom de la formation
  specialite: "fldCzrRaZNMbizqhi", // Spécialité
  dateCreation: "fldLNmbnKeu7Sc2eZ", // Date de création
  numeroDPC:  "fldA8D3ZFqacJ2MkK", // Numéro d'action DPC
} as const;

// ─── Mapping profession HubSpot → libellé lisible ──────────────────────────────

export const PROFESSION_LABELS: Record<string, string> = {
  MG:    "Médecin généraliste",
  CD:    "Chirurgien-dentiste",
  PSY:   "Psychiatre",
  PED:   "Pédiatre",
  GO_GM: "Gynécologue-Obstétricien",
  Autre: "Autre",
};

// ─── Types exposés ──────────────────────────────────────────────────────────────

export type Inscription = {
  formation: string;
  date: string;
  specialite: string;
  numeroDPC: string;
};

export type CallSource = "flunter" | "aircall" | null;

export type DashboardContact = {
  id: string;
  email: string;
  name: string;
  phone: string;
  profession: string;        // code HubSpot : MG, CD, PSY, PED, GO_GM, Autre
  professionLabel: string;
  created: string;           // ISO - date d'entrée dans le CRM (affichage/tri uniquement)
  simulateurDate: string;    // ISO - date de référence simulateur (croisement inscriptions)
  hasRdv: boolean;
  rdvJour: string;
  rdvCreneau: string;
  rdvMessage: string;
  rdvRequestDate: string;    // ISO - date de soumission de la demande de RDV ("Demande reçue le …"), "" si aucune
  lastCallDate: string;      // ISO - appel le plus récent entre Flunter et Aircall, "" si aucun
  callSource: CallSource;    // outil de l'appel le plus récent, null si aucun
  ownerName: string | null;  // commercial attribué (hubspot_owner_id résolu via l'API Owners), null si aucun
  isInscrit: boolean;
  inscriptions: Inscription[];
};

export type DashboardStats = {
  total: number;
  rdvCount: number;
  inscritCount: number;
  withPhone: number;
  conversionRdv: number;      // % lead → RDV
  conversionInscrit: number;  // % lead → inscription
  phonePct: number;           // % leads avec téléphone
  last30Days: number;
  byProfession: Record<string, number>;
  byMonth: { month: string; leads: number }[];
};

export type DashboardData = {
  contacts: DashboardContact[];
  stats: DashboardStats;
};

// ─── Helpers de coercition Airtable ─────────────────────────────────────────────

type SelectObj = { id?: string; name?: string };

function coerceString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    return val.map(coerceString).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    const o = val as SelectObj & { email?: string };
    return o.name ?? o.email ?? "";
  }
  return String(val);
}

// ─── HubSpot : contacts du simulateur ───────────────────────────────────────────

type HubSpotSearchResult = {
  results?: {
    id: string;
    properties: Record<string, string | null>;
  }[];
  paging?: { next?: { after?: string } };
};

const HUBSPOT_PROPERTIES = [
  "email",
  "firstname",
  "lastname",
  "phone",
  "certification_profession",
  "profession",
  "certification_rdv_demande",
  "certification_rdv_jour",
  "certification_rdv_creneau",
  "certification_rdv_message",
  "certification_simulateur_date",
  "createdate",
  "last_flunter_call_timestamp",
  "aircall_last_call_at",
  "hubspot_owner_id",
];

// ─── Contacts internes Médéré (tests) ───────────────────────────────────────────
// Exclus AVANT tout calcul : tableaux, KPIs, graphiques, performance commerciale.
// Pour exclure un nouveau testeur interne, ajouter son email, son domaine ou son nom complet ici.

const EXCLUDED_EMAILS = [
  "dethie@medere.fr",
  "dethie+test-simulateur@medere.fr",
  "faye.dethi@ugb.edu.sn",
  "arnaud@medere.fr",
  "noemie@medere.fr",
  "harrysitbon26@gmail.com",
  // Comptes de test
  "test@gmail.com",
  "lavieestbelle@tech.fr",
  "bestlife@tech.fr",
];

// Domaines internes : tout email de ces domaines est exclu (ex : harouna@medere.fr)
const EXCLUDED_DOMAINS = ["medere.fr"];

// Contacts internes identifiés par leur nom complet (prénom + nom HubSpot, match exact)
const EXCLUDED_NAMES = [
  "harry",
];

const EXCLUDED_EMAIL_SET = new Set(EXCLUDED_EMAILS.map((e) => e.toLowerCase()));
const EXCLUDED_NAME_SET = new Set(EXCLUDED_NAMES.map((n) => n.toLowerCase()));

function isInternalContact(c: { email: string; name: string }): boolean {
  const email = c.email.toLowerCase().trim();
  const domain = email.split("@")[1] ?? "";
  return (
    EXCLUDED_EMAIL_SET.has(email) ||
    EXCLUDED_DOMAINS.includes(domain) ||
    EXCLUDED_NAME_SET.has(c.name.toLowerCase().replace(/\s+/g, " ").trim())
  );
}

// ─── Date de référence du simulateur ───────────────────────────────────────────
// Date à partir de laquelle une inscription est attribuée au simulateur.
// NE JAMAIS utiliser createdate (date d'entrée dans le CRM, pas du simulateur).

// Date de lancement public du simulateur (fallback ultime)
const SIMULATEUR_LAUNCH = "2026-05-26T00:00:00.000Z";

const MOIS_MAP: Record<string, string> = {
  janvier: "01", février: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", août: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12",
};

// Extrait la date (et l'heure) de la ligne "Demande reçue le DD mois YYYY à HHhMM" du texte de RDV.
// Le bloc lettres accepte les accents (février, août, décembre).
// L'heure est écrite par /api/rdv via getHours() côté serveur (UTC sur Vercel) → suffixe Z.
// Ancien format sans heure → minuit.
function extractRdvReceivedDate(rdvText: string): string | null {
  const match = rdvText.match(/Demande reçue le (\d{1,2}) ([A-Za-zÀ-ÿ]+) (\d{4})(?: à (\d{1,2})h(\d{2}))?/);
  if (!match) return null;
  const [, day, monthStr, year, hours, minutes] = match;
  const month = MOIS_MAP[monthStr.toLowerCase()];
  if (!month) return null;
  const time = hours && minutes ? `${hours.padStart(2, "0")}:${minutes}` : "00:00";
  return `${year}-${month}-${day.padStart(2, "0")}T${time}:00.000Z`;
}

// Date de référence par ordre de priorité :
//   1) certification_simulateur_date (propriété dédiée posée à la soumission)
//   2) date extraite de certification_rdv_demande ("Demande reçue le …")
//   3) date de lancement public du simulateur
function getSimulateurDate(p: {
  certification_simulateur_date?: string | null;
  certification_rdv_demande?: string | null;
}): string {
  if (p.certification_simulateur_date) {
    const d = new Date(p.certification_simulateur_date);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (p.certification_rdv_demande) {
    const rdvDate = extractRdvReceivedDate(p.certification_rdv_demande);
    if (rdvDate) return rdvDate;
  }
  return SIMULATEUR_LAUNCH;
}

// Timestamp d'appel HubSpot : ISO ou timestamp ms selon la propriété
function parseCallDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const t = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  return isNaN(t) ? null : new Date(t);
}

// Dernier rappel : date la plus récente entre Flunter et Aircall
// (certains commerciaux utilisaient Aircall avant de migrer sur Flunter).
function getLastCall(p: {
  last_flunter_call_timestamp?: string | null;
  aircall_last_call_at?: string | null;
}): { lastCallDate: string; callSource: CallSource } {
  const flunterDate = parseCallDate(p.last_flunter_call_timestamp);
  const aircallDate = parseCallDate(p.aircall_last_call_at);

  let lastCallDate: Date | null = null;
  let callSource: CallSource = null;
  if (flunterDate && aircallDate) {
    const flunterWins = flunterDate > aircallDate;
    lastCallDate = flunterWins ? flunterDate : aircallDate;
    callSource = flunterWins ? "flunter" : "aircall";
  } else if (flunterDate) {
    lastCallDate = flunterDate;
    callSource = "flunter";
  } else if (aircallDate) {
    lastCallDate = aircallDate;
    callSource = "aircall";
  }
  return { lastCallDate: lastCallDate ? lastCallDate.toISOString() : "", callSource };
}

// Résout les owners HubSpot (commerciaux) : ownerId → "Prénom Nom".
// Map vide en cas d'erreur (ex : scope crm.objects.owners.read manquant).
async function fetchOwnerNames(): Promise<Map<string, string>> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return new Map();

  try {
    const response = await fetch("https://api.hubapi.com/crm/v3/owners?limit=500", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[dashboard] HubSpot owners error:", response.status, await response.text());
      return new Map();
    }
    const data = (await response.json()) as {
      results?: { id: string | number; firstName?: string; lastName?: string; email?: string }[];
    };
    const map = new Map<string, string>();
    for (const owner of data.results ?? []) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
      map.set(String(owner.id), name || owner.email || "Inconnu");
    }
    return map;
  } catch (err) {
    console.error("[dashboard] HubSpot owners fetch failed:", err);
    return new Map();
  }
}

export async function fetchAllHubSpotContacts(): Promise<DashboardContact[]> {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key) {
    console.warn("[dashboard] HUBSPOT_API_KEY non configurée");
    return [];
  }

  // Owners lancés en parallèle de la pagination des contacts (aucune latence ajoutée)
  const ownersPromise = fetchOwnerNames();
  const ownerIds = new Map<string, string>(); // contact id → hubspot_owner_id

  const contacts: DashboardContact[] = [];
  let after: string | undefined;

  // L'API Search pagine par lots de 100 via le curseur "after"
  do {
    const res = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "certification_source",
                  operator: "EQ",
                  value: "simulateur_web",
                },
              ],
            },
          ],
          properties: HUBSPOT_PROPERTIES,
          sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
          limit: 100,
          after,
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("[dashboard] HubSpot search error:", res.status, await res.text());
      break;
    }

    const data = (await res.json()) as HubSpotSearchResult;

    for (const r of data.results ?? []) {
      const p = r.properties;
      const code = p.certification_profession || "Autre";
      const first = p.firstname ?? "";
      const last = p.lastname ?? "";
      const name = `${first} ${last}`.trim() || (p.email ?? "—");
      const rdvDemande = p.certification_rdv_demande ?? "";

      contacts.push({
        id: r.id,
        email: (p.email ?? "").toLowerCase(),
        name,
        phone: p.phone ?? "",
        profession: code,
        professionLabel: PROFESSION_LABELS[code] ?? code,
        created: p.createdate ?? "",
        simulateurDate: getSimulateurDate(p),
        hasRdv: rdvDemande.trim().length > 0,
        rdvJour: p.certification_rdv_jour ?? "",
        rdvCreneau: p.certification_rdv_creneau ?? "",
        rdvMessage: p.certification_rdv_message ?? "",
        rdvRequestDate: extractRdvReceivedDate(rdvDemande) ?? "",
        ...getLastCall(p),
        ownerName: null,
        isInscrit: false,
        inscriptions: [],
      });
      if (p.hubspot_owner_id) ownerIds.set(r.id, p.hubspot_owner_id);
    }

    after = data.paging?.next?.after;
  } while (after);

  const ownerMap = await ownersPromise;
  for (const c of contacts) {
    const ownerId = ownerIds.get(c.id);
    c.ownerName = (ownerId && ownerMap.get(ownerId)) || null;
  }

  // Exclusion des contacts internes avant toute stat (buildStats, croisement Airtable, UI)
  return contacts.filter((c) => !isInternalContact(c));
}

// ─── Airtable : table Inscriptions ──────────────────────────────────────────────

type AirtableRecord = { id: string; fields: Record<string, unknown> };
type AirtableResponse = { records: AirtableRecord[]; offset?: string };

type RawInscription = { email: string; inscription: Inscription };

const AIRTABLE_FIELDS_PARAM = Object.values(INSCRIPTION_FIELDS)
  .map((id) => `fields[]=${id}`)
  .join("&");

// Nom du champ Email (filterByFormula exige le nom, pas l'ID de champ)
const AIRTABLE_EMAIL_FIELD = "Email";

function parseInscriptionRecord(rec: AirtableRecord): RawInscription | null {
  const f = rec.fields;
  const email = coerceString(f[INSCRIPTION_FIELDS.email]).toLowerCase().trim();
  if (!email) return null;
  return {
    email,
    inscription: {
      formation: coerceString(f[INSCRIPTION_FIELDS.formation]),
      date: coerceString(f[INSCRIPTION_FIELDS.dateCreation]),
      specialite: coerceString(f[INSCRIPTION_FIELDS.specialite]),
      numeroDPC: coerceString(f[INSCRIPTION_FIELDS.numeroDPC]),
    },
  };
}

// Récupère, page par page, les inscriptions correspondant à un sous-ensemble d'emails.
async function fetchChunk(key: string, emails: string[]): Promise<RawInscription[]> {
  // filterByFormula : OR(LOWER({Email})="e1", ...) — match insensible à la casse
  const clauses = emails
    .map((e) => `LOWER({${AIRTABLE_EMAIL_FIELD}})="${e.replace(/"/g, '\\"')}"`)
    .join(",");
  const formula = `OR(${clauses})`;
  const baseUrl =
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_INSCRIPTIONS}` +
    `?${AIRTABLE_FIELDS_PARAM}&returnFieldsByFieldId=true&pageSize=100` +
    `&filterByFormula=${encodeURIComponent(formula)}`;

  const out: RawInscription[] = [];
  let offset: string | undefined;
  do {
    const url = offset ? `${baseUrl}&offset=${offset}` : baseUrl;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[dashboard] Airtable error:", res.status, await res.text());
      break;
    }
    const data = (await res.json()) as AirtableResponse;
    for (const rec of data.records) {
      const parsed = parseInscriptionRecord(rec);
      if (parsed) out.push(parsed);
    }
    offset = data.offset;
  } while (offset);
  return out;
}

// Récupère uniquement les inscriptions des emails fournis (les leads du simulateur).
// La table Inscriptions compte des dizaines de milliers de lignes : on ne récupère
// JAMAIS tout — on filtre côté Airtable par lots d'emails interrogés en parallèle.
export async function fetchAirtableInscriptions(emails: string[]): Promise<RawInscription[]> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) {
    console.warn("[dashboard] AIRTABLE_API_KEY non configurée");
    return [];
  }

  // Normalisation + déduplication des emails
  const unique = Array.from(
    new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))
  );
  if (unique.length === 0) return [];

  // Découpe en lots (URL filterByFormula limitée) interrogés en parallèle
  const CHUNK = 40;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    chunks.push(unique.slice(i, i + CHUNK));
  }

  const results = await Promise.all(chunks.map((c) => fetchChunk(key, c)));
  return results.flat();
}

// ─── Statistiques ────────────────────────────────────────────────────────────────

export function buildStats(contacts: DashboardContact[]): DashboardStats {
  const total = contacts.length;
  const rdvCount = contacts.filter((c) => c.hasRdv).length;
  const inscritCount = contacts.filter((c) => c.isInscrit).length;
  const withPhone = contacts.filter((c) => c.phone.trim().length > 0).length;

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const last30Days = contacts.filter((c) => {
    const t = Date.parse(c.created);
    return !isNaN(t) && now - t <= THIRTY_DAYS;
  }).length;

  // Répartition par profession (toujours initialiser les clés connues)
  const byProfession: Record<string, number> = {
    MG: 0, CD: 0, PSY: 0, PED: 0, GO_GM: 0, Autre: 0,
  };
  for (const c of contacts) {
    const key = byProfession[c.profession] !== undefined ? c.profession : "Autre";
    byProfession[key]++;
  }

  // Leads par mois sur les 12 derniers mois
  const months: { month: string; leads: number }[] = [];
  const monthIndex = new Map<string, number>();
  const ref = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthIndex.set(key, months.length);
    months.push({ month: key, leads: 0 });
  }
  for (const c of contacts) {
    const t = Date.parse(c.created);
    if (isNaN(t)) continue;
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx].leads++;
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  return {
    total,
    rdvCount,
    inscritCount,
    withPhone,
    conversionRdv: pct(rdvCount),
    conversionInscrit: pct(inscritCount),
    phonePct: pct(withPhone),
    last30Days,
    byProfession,
    byMonth: months,
  };
}

// ─── Croisement avec filtre temporel ──────────────────────────────────────────────

// Couple email → date de référence simulateur (cf. getSimulateurDate)
export type ContactRef = { email: string; simulateurDate: string };

// Croise les inscriptions Airtable avec les contacts, en ne retenant QUE les
// inscriptions POSTÉRIEURES à la date de référence simulateur du contact.
// Une inscription antérieure (ex : PS déjà client avant d'utiliser le simulateur)
// n'est PAS considérée comme une conversion du simulateur.
export function buildValidInscriptionsMap(
  contacts: ContactRef[],
  inscriptions: RawInscription[]
): Record<string, Inscription[]> {
  // Date de référence simulateur par email (en ms)
  const submittedAt = new Map<string, number>();
  for (const c of contacts) {
    const t = Date.parse(c.simulateurDate);
    if (!isNaN(t)) submittedAt.set(c.email.toLowerCase().trim(), t);
  }

  const map: Record<string, Inscription[]> = {};
  for (const { email, inscription } of inscriptions) {
    const contactTime = submittedAt.get(email);
    if (contactTime === undefined) continue; // email hors leads simulateur

    const inscriptionTime = Date.parse(inscription.date);
    if (isNaN(inscriptionTime)) continue;     // date d'inscription absente/illisible → on écarte

    // Conversion réelle : inscription créée APRÈS la soumission du simulateur
    if (inscriptionTime > contactTime) {
      (map[email] ??= []).push(inscription);
    }
  }
  return map;
}

// Récupère et croise (avec filtre temporel) les inscriptions des contacts fournis.
// Toute la logique de filtrage vit ici, côté serveur.
export async function getInscriptionsMapForContacts(
  contacts: ContactRef[]
): Promise<Record<string, Inscription[]>> {
  const raw = await fetchAirtableInscriptions(contacts.map((c) => c.email));
  return buildValidInscriptionsMap(contacts, raw);
}

// ─── Point d'entrée (route monolithique /api/dashboard, conservée) ─────────────────

export async function getDashboardData(): Promise<DashboardData> {
  // On récupère d'abord les contacts, puis UNIQUEMENT les inscriptions de leurs emails
  // (la table Inscriptions est trop volumineuse pour être chargée intégralement).
  const contacts = await fetchAllHubSpotContacts();
  const inscriptionsByEmail = await getInscriptionsMapForContacts(
    contacts.map((c) => ({ email: c.email, simulateurDate: c.simulateurDate }))
  );

  // Croisement avec filtre temporel déjà appliqué (inscription > date contact)
  for (const c of contacts) {
    const matches = inscriptionsByEmail[c.email];
    if (matches && matches.length > 0) {
      c.isInscrit = true;
      c.inscriptions = matches;
    }
  }

  return { contacts, stats: buildStats(contacts) };
}
