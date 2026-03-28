// POST /api/report - Génération PDF personnalisé
// Retourne le PDF en base64 pour téléchargement côté client

import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/pdf/generate";
import type { ProfessionId } from "@/lib/professions";
import type { DiplomaYear, DimensionStatus, Urgency } from "@/lib/scoring";

export const runtime = "nodejs";

type ReportRequestBody = {
  profession: ProfessionId;
  diplomaYear: DiplomaYear;
  dpcFormations: string;
  email: string;
  score: number;
  urgency: Urgency;
  bloc1Status: DimensionStatus;
  bloc2Status: DimensionStatus;
  bloc3Status: DimensionStatus;
  bloc4Status: DimensionStatus;
};

const VALID_PROFESSIONS: ProfessionId[] = ["MG", "CD", "GO", "PED", "PSY", "AUTRE"];
const VALID_DIPLOMA_YEARS: DiplomaYear[] = [
  "avant_2000",
  "2000_2010",
  "2011_2022",
  "apres_2023",
];
const VALID_STATUSES: DimensionStatus[] = ["valide", "en_cours", "a_faire"];
const VALID_URGENCIES: Urgency[] = ["rouge", "orange", "vert"];

function validate(body: Partial<ReportRequestBody>): body is ReportRequestBody {
  return (
    VALID_PROFESSIONS.includes(body.profession as ProfessionId) &&
    VALID_DIPLOMA_YEARS.includes(body.diplomaYear as DiplomaYear) &&
    typeof body.score === "number" &&
    body.score >= 0 &&
    body.score <= 8 &&
    VALID_URGENCIES.includes(body.urgency as Urgency) &&
    VALID_STATUSES.includes(body.bloc1Status as DimensionStatus) &&
    VALID_STATUSES.includes(body.bloc2Status as DimensionStatus) &&
    VALID_STATUSES.includes(body.bloc3Status as DimensionStatus) &&
    VALID_STATUSES.includes(body.bloc4Status as DimensionStatus)
  );
}

export async function POST(req: NextRequest) {
  let body: Partial<ReportRequestBody>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  if (!validate(body)) {
    return NextResponse.json(
      { success: false, error: "Paramètres manquants ou invalides" },
      { status: 422 }
    );
  }

  try {
    const pdfBuffer = await generateReport({
      profession:   body.profession,
      diplomaYear:  body.diplomaYear,
      dpcFormations: body.dpcFormations ?? "",
      email:        body.email ?? "",
      score:        body.score,
      urgency:      body.urgency,
      bloc1Status:  body.bloc1Status,
      bloc2Status:  body.bloc2Status,
      bloc3Status:  body.bloc3Status,
      bloc4Status:  body.bloc4Status,
    });

    const pdf = pdfBuffer.toString("base64");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const filename = `diagnostic-certification-${body.profession.toLowerCase()}-${yyyy}${mm}${dd}.pdf`;

    return NextResponse.json({ success: true, pdf, filename });
  } catch (err) {
    console.error("[/api/report] PDF generation error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
