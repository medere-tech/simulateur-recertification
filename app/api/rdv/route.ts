// POST /api/rdv - Demande de rappel téléphonique
// 1. Notifie l'équipe commerciale via Slack
// 2. Met à jour le contact HubSpot existant (créé à l'étape email)

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

async function updateHubSpotContact(payload: RdvPayload): Promise<void> {
  const hubspotKey = process.env.HUBSPOT_API_KEY;
  if (!hubspotKey) {
    console.log('[HUBSPOT] Clé API non configurée, mise à jour ignorée');
    return;
  }

  // 1. Chercher le contact par email
  const searchResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: payload.email,
          }],
        }],
      }),
    }
  );

  const searchData = await searchResponse.json() as { results?: { id: string }[] };

  if (!searchData.results?.length) {
    console.log('[HUBSPOT] Contact non trouvé pour:', payload.email);
    return;
  }

  const contactId = searchData.results[0].id;

  // 2. Mettre à jour les champs standards uniquement
  await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${hubspotKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          firstname: payload.prenom,
          lastname:  payload.nom,
          phone:     payload.phone,
        },
      }),
    }
  );

  console.log('[HUBSPOT] Contact mis à jour:', contactId);
}

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

  const fullPayload: RdvPayload = {
    prenom:       prenom!,
    nom:          nom!,
    email:        email!,
    phone:        phone!,
    jourRappel:   jourRappel!,
    heureRappel:  heureRappel!,
    message,
    profession:   profession!,
    professionLabel,
    score:        score!,
    urgency:      urgency || "vert",
  };

  // Fire-and-forget Slack — ne bloque pas la réponse
  sendSlackNotification({
    type: "rdv",
    ...fullPayload,
  }).catch((err) => console.error('[SLACK] Fire-and-forget error:', err));

  // Fire-and-forget HubSpot — ne bloque pas la réponse
  updateHubSpotContact(fullPayload)
    .catch((err) => console.error('[HUBSPOT] Erreur mise à jour:', err));

  return NextResponse.json({ success: true });
}
