// Client API HubSpot v3 - upsert contact + 3 propriétés custom certification
// Clé API : process.env.HUBSPOT_API_KEY

const HUBSPOT_API = "https://api.hubapi.com/crm/v3/objects/contacts";

export type HubSpotContact = {
  email: string;
  firstname?: string;
  phone?: string;
  certification_profession: "MG" | "CD" | "GO_GM" | "PED" | "PSY" | "Autre";
};

// Mapping profession app → valeur HubSpot
export const PROFESSION_MAP: Record<string, HubSpotContact["certification_profession"]> = {
  MG:    "MG",
  CD:    "CD",
  GO:    "GO_GM",
  PED:   "PED",
  PSY:   "PSY",
  AUTRE: "Autre",
};

// Mapping valeur HubSpot certification_profession → libellé du dropdown standard "profession"
export const CERTIFICATION_TO_PROFESSION: Record<string, string> = {
  MG:    'Médecin',
  CD:    'Chirurgien-dentiste',
  GO_GM: 'Gynécologue',
  PED:   'Pédiatre',
  PSY:   'Psychiatre',
  Autre: 'Autre',
};

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

function buildProperties(contact: HubSpotContact): Record<string, string> {
  const hubspotProfession =
    PROFESSION_MAP[contact.certification_profession] ?? contact.certification_profession;
  const props: Record<string, string> = {
    email:                    contact.email,
    firstname:                contact.firstname ?? "",
    phone:                    contact.phone ?? "",
    certification_profession: hubspotProfession,
    certification_source:     "simulateur_web",
    certification_pdf_sent:   "false",
    profession:               CERTIFICATION_TO_PROFESSION[hubspotProfession] || 'Autre',
  };
  return props;
}

export type UpsertResult =
  | { success: true;  contactId: string }
  | { success: false; error: string };

export async function upsertContact(contact: HubSpotContact): Promise<UpsertResult> {
  const properties = buildProperties(contact);

  // ── 1. Essai création ─────────────────────────────────────────────────────
  const createRes = await fetch(HUBSPOT_API, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ properties }),
  });

  if (createRes.ok) {
    const data = await createRes.json() as { id: string };
    return { success: true, contactId: data.id };
  }

  // ── 2. Conflit (409) → mise à jour par email ──────────────────────────────
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
