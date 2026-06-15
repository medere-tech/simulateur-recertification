// GET /api/dashboard - Données agrégées du simulateur (HubSpot + Airtable)
// Route monolithique conservée pour compatibilité. Le dashboard utilise désormais
// les routes légères /api/dashboard/contacts et /api/dashboard/inscriptions.
// Protégée par Basic Auth (DASHBOARD_USER / DASHBOARD_PASSWORD).

import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { checkDashboardAuth } from "@/lib/dashboardAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = checkDashboardAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const data = await getDashboardData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/dashboard] Erreur:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
