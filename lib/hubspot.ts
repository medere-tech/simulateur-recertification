// Client API HubSpot v3 - upsert contact + propriétés custom certification
// Clé API : process.env.HUBSPOT_API_KEY

const HUBSPOT_API = "https://api.hubapi.com/crm/v3/objects/contacts";

export type HubSpotContact = {
  email: string;
  phone?: string;
  certification_score: number;
  certification_profession: "MG" | "CD" | "GO_GM" | "PED" | "PSY" | "AUTRE";
  certification_diploma_year: "avant_2000" | "2000_2010" | "2011_2022" | "apres_2023";
  certification_dpc_formations: "3_plus" | "1_ou_2" | "aucune" | "ne_sait_pas";
  certification_urgency: "rouge" | "orange" | "vert";
  certification_bloc1_status: "valide" | "en_cours" | "a_faire";
  certification_bloc2_status: "valide" | "en_cours" | "a_faire";
  certification_awareness?: string;
  certification_source?: string;
  certification_pdf_sent?: boolean;
};

// Mapping profession app → valeur HubSpot
const PROFESSION_MAP: Record<string, HubSpotContact["certification_profession"]> = {
  MG:    "MG",
  CD:    "CD",
  GO:    "GO_GM",
  PED:   "PED",
  PSY:   "PSY",
  AUTRE: "AUTRE",
};

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

function buildProperties(contact: HubSpotContact): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {
    email:                        contact.email,
    certification_score:          contact.certification_score,
    certification_profession:     PROFESSION_MAP[contact.certification_profession] ?? contact.certification_profession,
    certification_diploma_year:   contact.certification_diploma_year,
    certification_dpc_formations: contact.certification_dpc_formations,
    certification_urgency:        contact.certification_urgency,
    certification_bloc1_status:   contact.certification_bloc1_status,
    certification_bloc2_status:   contact.certification_bloc2_status,
    certification_date:           new Date().toISOString().split("T")[0], // YYYY-MM-DD
  };
  if (contact.phone)                   props.phone                     = contact.phone;
  if (contact.certification_awareness) props.certification_awareness    = contact.certification_awareness;
  if (contact.certification_source)    props.certification_source       = contact.certification_source;
  if (contact.certification_pdf_sent != null) props.certification_pdf_sent = contact.certification_pdf_sent;
  return props;
}

export type UpsertResult =
  | { success: true;  contactId: string }
  | { success: false; error: string };

export async function upsertContact(contact: HubSpotContact): Promise<UpsertResult> {
  const properties = buildProperties(contact);

  // ── 1. Essai création ────────────────────────────────────────────────────────
  const createRes = await fetch(HUBSPOT_API, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ properties }),
  });

  if (createRes.ok) {
    const data = await createRes.json() as { id: string };
    return { success: true, contactId: data.id };
  }

  // ── 2. Conflit (409) → mise à jour par email ─────────────────────────────────
  if (createRes.status === 409) {
    const encodedEmail = encodeURIComponent(contact.email);
    const patchRes = await fetch(
      `${HUBSPOT_API}/${encodedEmail}?idProperty=email`,
      {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify({ properties }),
      }
    );

    if (patchRes.ok) {
      const data = await patchRes.json() as { id: string };
      return { success: true, contactId: data.id };
    }

    const errBody = await patchRes.text();
    return { success: false, error: `HubSpot PATCH ${patchRes.status}: ${errBody}` };
  }

  const errBody = await createRes.text();
  return { success: false, error: `HubSpot POST ${createRes.status}: ${errBody}` };
}
