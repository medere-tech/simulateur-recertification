// POST /api/report — Génération PDF personnalisé + envoi email
// TODO : implémenter avec @react-pdf/renderer dans une prochaine session

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Placeholder — la vraie implémentation lira le body pour générer le PDF
  void req;
  return NextResponse.json({
    success: true,
    message: "PDF generation coming soon",
  });
}
