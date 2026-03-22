// GET /api/formations?profession=MG
// Retourne les formations Airtable éligibles pour la profession (blocs 1 & 2)
// Cache Next.js : revalidate 3600s (1h) — évite de spammer Airtable

import { NextRequest, NextResponse } from "next/server";
import { getFormationsByProfession } from "@/lib/airtable";

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const profession = req.nextUrl.searchParams.get("profession");

  if (!profession) {
    return NextResponse.json(
      { success: false, error: "Paramètre 'profession' manquant" },
      { status: 400 }
    );
  }

  const formations = await getFormationsByProfession(profession);

  return NextResponse.json({ success: true, formations });
}
