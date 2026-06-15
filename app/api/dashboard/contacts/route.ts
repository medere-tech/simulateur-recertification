// POST /api/dashboard/contacts - Contacts HubSpot du simulateur + stats de base
// Route légère : ne touche pas Airtable (croisement géré séparément).
// Protégée par Basic Auth.

import { NextRequest, NextResponse } from "next/server";
import { fetchAllHubSpotContacts, buildStats } from "@/lib/dashboard";
import { checkDashboardAuth } from "@/lib/dashboardAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = checkDashboardAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const contacts = await fetchAllHubSpotContacts();
    const stats = buildStats(contacts);
    return NextResponse.json({ contacts, stats }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/dashboard/contacts] Erreur:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des contacts" },
      { status: 500 }
    );
  }
}
