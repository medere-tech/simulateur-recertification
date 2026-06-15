// POST /api/dashboard/inscriptions - Inscriptions Airtable des leads, indexées par email
// Body : { contacts: { email: string; simulateurDate: string }[] }
//   - email         : email du lead (HubSpot)
//   - simulateurDate : date de référence simulateur (cf. getSimulateurDate dans lib/dashboard.ts)
// La table Inscriptions est volumineuse : on ne récupère que les inscriptions des emails
// fournis, et on ne conserve que celles POSTÉRIEURES à la soumission du simulateur
// (filtre temporel appliqué dans lib/dashboard.ts). Protégée par Basic Auth.

import { NextRequest, NextResponse } from "next/server";
import { getInscriptionsMapForContacts, type ContactRef } from "@/lib/dashboard";
import { checkDashboardAuth } from "@/lib/dashboardAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = checkDashboardAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let contacts: ContactRef[] = [];
  try {
    const body = (await req.json()) as { contacts?: unknown };
    if (Array.isArray(body.contacts)) {
      contacts = body.contacts
        .filter(
          (c): c is ContactRef =>
            !!c && typeof c === "object" &&
            typeof (c as ContactRef).email === "string" &&
            typeof (c as ContactRef).simulateurDate === "string"
        );
    }
  } catch {
    // Corps absent ou invalide → aucun contact à croiser
  }

  try {
    const inscriptionsByEmail = await getInscriptionsMapForContacts(contacts);
    return NextResponse.json(
      { inscriptionsByEmail },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/dashboard/inscriptions] Erreur:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des inscriptions" },
      { status: 500 }
    );
  }
}
