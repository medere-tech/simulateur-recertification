// Envoi du rapport PDF par email via SMTP (Nodemailer)
// Utilise les variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

import nodemailer from "nodemailer";

export type SendReportEmailParams = {
  to: string;
  profession: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export type SendEmailResult =
  | { success: true }
  | { success: false; error: string };

function buildEmailBody(profession: string): { salutation: string; closing: string } {
  const isDoctoral = ["MG", "CD", "GO", "PED", "PSY"].includes(profession);
  return {
    salutation: isDoctoral ? "Docteur," : "Bonjour,",
    closing:    isDoctoral ? "Bien confraternellement," : "Cordialement,",
  };
}

export async function sendReportEmail(params: SendReportEmailParams): Promise<SendEmailResult> {
  const { salutation, closing } = buildEmailBody(params.profession);

  const emailBody = `${salutation}

Suite à votre diagnostic sur notre simulateur de certification périodique, vous trouverez en pièce jointe votre rapport personnalisé.

Ce document synthétise :
- Votre score actuel sur les 8 actions requises
- Le détail par bloc de votre situation
- Les formations Médéré éligibles à votre certification
- Les échéances et les modalités de prise en charge ANDPC

Si vous souhaitez être accompagné dans votre démarche de certification, notre équipe est disponible pour en discuter :

Tél. : 01 88 33 95 28
Email : contact@medere.fr

Vous pouvez également réserver un créneau directement :
https://meetings-eu1.hubspot.com/

${closing}

L'équipe Médéré
Organisme de formation DPC n°9262 - Qualiopi certifié
medere.fr

---
Ce document est basé sur l'arrêté du 26 février 2026 (NOR : SFHH2605575A). Il constitue une estimation indicative. La validation finale de votre certification est prononcée par votre Ordre professionnel.
`;

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || "smtp.hubapi.com",
      port:   parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Médéré" <${process.env.EMAIL_FROM || "contact@medere.fr"}>`,
      to:      params.to,
      subject: "🎉​ Resultat de votre diagnostic certification périodique - Médéré",
      text:    emailBody,
      attachments: [
        {
          filename:    params.pdfFilename,
          content:     params.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur SMTP inconnue",
    };
  }
}
