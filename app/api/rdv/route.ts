// POST /api/rdv - Demande de rappel téléphonique
// Notifie l'équipe commerciale via Slack
// Pas de HubSpot — le lead est déjà créé à l'étape précédente

import { NextRequest, NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/slack";
import { PROFESSIONS } from "@/lib/professions";
import type { ProfessionId } from "@/lib/professions";

export const runtime = "nodejs";

type RdvPayload = {
  prenom: string;
  nom: string;
  email: string;
  phone: string;
  jourRappel: string;
  heureRappel: string;
  message?: string;
  profession: string;
  professionLabel: string;
  score: number;
  urgency: string;
};

export async function POST(req: NextRequest) {
  let payload: Partial<RdvPayload>;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  const {
    prenom,
    nom,
    email,
    phone,
    jourRappel,
    heureRappel,
    message,
    profession,
    score,
    urgency,
  } = payload;

  // Validation des champs obligatoires
  if (
    !prenom?.trim() ||
    !nom?.trim() ||
    !email?.trim() ||
    !phone?.trim() ||
    !jourRappel?.trim() ||
    !heureRappel?.trim() ||
    !profession?.trim() ||
    typeof score !== "number"
  ) {
    return NextResponse.json(
      { success: false, error: "Champs obligatoires manquants" },
      { status: 422 }
    );
  }

  const professionLabel =
    PROFESSIONS[profession as ProfessionId]?.label ?? profession;

  // Fire-and-forget — ne bloque pas la réponse
  sendSlackNotification({
    type: "rdv",
    email: email!,
    phone: phone!,
    profession: profession!,
    professionLabel,
    score: score!,
    urgency: urgency || "vert",
    nom: nom!,
    prenom: prenom!,
    jourRappel: jourRappel!,
    heureRappel: heureRappel!,
    message,
  }).catch((err) => console.error("[SLACK] Fire-and-forget error:", err));

  return NextResponse.json({ success: true });
}
