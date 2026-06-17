// POST /api/report - Génération PDF personnalisé
// Retourne le PDF en base64 pour téléchargement côté client

import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/lib/pdf/generate";
import { sendReportEmail } from "@/lib/email";
import { CONFIG } from "@/lib/config";
import { getFormationsByProfession, selectFormationsForReport } from "@/lib/airtable";
import { PROFESSIONS } from "@/lib/professions";
import type { ProfessionId } from "@/lib/professions";
import type { DiplomaYear, DimensionStatus, Urgency } from "@/lib/scoring";
import { sendSlackNotification } from "@/lib/slack";
import { upsertContact, createContactNote, HubSpotContact } from "@/lib/hubspot";

export const runtime = "nodejs";

type ReportRequestBody = {
  profession: ProfessionId;
  diplomaYear: DiplomaYear;
  dpcFormations: string;
  email: string;
  phone?: string;
  score: number;
  urgency: Urgency;
  bloc1Status: DimensionStatus;
  bloc2Status: DimensionStatus;
  bloc3Status: DimensionStatus;
  bloc4Status: DimensionStatus;
  sendEmail?: boolean;
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

// ─── Libellés pour la note HubSpot ────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  valide:   '✅ Validé (2/2)',
  en_cours: '⚠️ En cours (1/2)',
  a_faire:  '❌ À faire (0/2)',
};

const URGENCY_LABEL: Record<string, string> = {
  rouge:  '🔴 Situation critique',
  orange: '🟠 En cours',
  vert:   '🟢 Bien avancé',
};

const DIPLOMA_LABEL: Record<string, string> = {
  avant_2000: 'Avant 2000',
  '2000_2010': '2000–2010',
  '2011_2022': '2011–2022',
  apres_2023: 'Après 2023',
};

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
    const allFormations = await getFormationsByProfession(body.profession);
    console.log(`[REPORT] Formations reçues d'Airtable pour ${body.profession} : ${allFormations.length}`);
    const formations = selectFormationsForReport(
      allFormations,
      body.profession,
      body.bloc1Status,
      body.bloc2Status,
      body.bloc3Status,
      body.bloc4Status,
    );

    const pdfBuffer = await generateReport({
      profession:    body.profession,
      diplomaYear:   body.diplomaYear,
      dpcFormations: body.dpcFormations ?? "",
      email:         body.email ?? "",
      score:         body.score,
      urgency:       body.urgency,
      bloc1Status:   body.bloc1Status,
      bloc2Status:   body.bloc2Status,
      bloc3Status:   body.bloc3Status,
      bloc4Status:   body.bloc4Status,
      formations,
    });

    const pdf = pdfBuffer.toString("base64");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const filename = `diagnostic-certification-${body.profession.toLowerCase()}-${yyyy}${mm}${dd}.pdf`;

    let pdfSent = false;
    if (body.sendEmail && CONFIG.SMTP_ENABLED && body.email) {
      const emailResult = await sendReportEmail({
        to:          body.email,
        profession:  body.profession,
        pdfBuffer,
        pdfFilename: filename,
      });
      pdfSent = emailResult.success;
      if (!emailResult.success) {
        console.error("[/api/report] SMTP error:", emailResult.error);
      }
    }

    // Fire-and-forget Slack - ne bloque pas la réponse
    if (body.sendEmail && body.email) {
      const professionLabel = PROFESSIONS[body.profession]?.label ?? body.profession;
      sendSlackNotification({
        type: 'lead',
        email: body.email,
        phone: body.phone,
        profession: body.profession,
        professionLabel,
        score: body.score,
        urgency: body.urgency,
      }).catch(err => console.error('[SLACK] Fire-and-forget error:', err));
    }

    // ── Note HubSpot (timeline commerciaux) - fire-and-forget ──────────────────
    // Construit le résumé du diagnostic et l'ajoute en note sur la fiche contact.
    // Ne bloque JAMAIS la réponse HTTP ni l'envoi du PDF.
    if (CONFIG.HUBSPOT_ENABLED && body.email) {
      const professionLabel = PROFESSIONS[body.profession]?.label ?? body.profession;

      // Échéance (cf. lib/scoring.ts getEcheance) :
      // MG/CD diplômés avant 2023 → cycle 9 ans → 2032, sinon 2028.
      const deadlineYear =
        (body.profession === "MG" || body.profession === "CD") && body.diplomaYear !== "apres_2023"
          ? 2032
          : 2028;

      const formationsHtml =
        formations
          .flatMap((bloc) => bloc.formations.map((f) => `• ${f.titre} (${f.format})`))
          .join("<br>") || "Aucune (tous les blocs sont validés)";

      const noteBody = `
<h3>📊 Diagnostic certification périodique</h3>
<p>
<strong>Profession :</strong> ${professionLabel}<br>
<strong>Score :</strong> ${body.score}/8 - ${URGENCY_LABEL[body.urgency] ?? body.urgency}<br>
<strong>Année de diplôme :</strong> ${DIPLOMA_LABEL[body.diplomaYear] ?? body.diplomaYear} → Échéance ${deadlineYear}
</p>
<p>
<strong>Bloc 1 - Connaissances :</strong> ${STATUS_LABEL[body.bloc1Status] ?? body.bloc1Status}<br>
<strong>Bloc 2 - Qualité des pratiques :</strong> ${STATUS_LABEL[body.bloc2Status] ?? body.bloc2Status}<br>
<strong>Bloc 3 - Relation patient :</strong> ${STATUS_LABEL[body.bloc3Status] ?? body.bloc3Status}<br>
<strong>Bloc 4 - Santé personnelle :</strong> ${STATUS_LABEL[body.bloc4Status] ?? body.bloc4Status}
</p>
<p>
<strong>Formations recommandées dans le rapport :</strong><br>
${formationsHtml}
</p>
<p><em>Rapport PDF envoyé le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</em></p>
`.trim();

      // Upsert (idempotent) pour récupérer le contactId, puis note - sans bloquer.
      void (async () => {
        try {
          const contact: HubSpotContact = {
            email:                    body.email,
            phone:                    body.phone || undefined,
            certification_profession: body.profession as HubSpotContact["certification_profession"],
          };
          const result = await upsertContact(contact);
          if (result.success && result.contactId) {
            await createContactNote(result.contactId, noteBody);
          } else if (!result.success) {
            console.error("[NOTE] upsert error:", result.error);
          }
        } catch (err) {
          console.error("[NOTE] Error:", err);
        }
      })();
    }

    return NextResponse.json({ success: true, pdf, filename, pdfSent });
  } catch (err) {
    console.error("[/api/report] PDF generation error:", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
