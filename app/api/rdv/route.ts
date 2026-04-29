// POST /api/rdv - Demande de rappel téléphonique
// 1. Notifie l'équipe commerciale via Slack
// 2. Met à jour le contact HubSpot existant (créé à l'étape email)
// NOTE : Slack + HubSpot sont awaités avec un timeout de 5s
//        pour éviter d'être tués par Vercel avant completion

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

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois = ['janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'];
  return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

function formatNowFr(): string {
  const now = new Date();
  const mois = ['janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'];
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} à ${h}h${m}`;
}

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
  console.log('[HUBSPOT] Search result count:', searchData.results?.length ?? 0);

  if (!searchData.results?.length) {
    console.log('[HUBSPOT] Contact non trouvé pour:', payload.email);
    return;
  }

  const contactId = searchData.results[0].id;

  const rdvText = [
    '📅 RAPPEL DEMANDÉ',
    `Jour : ${formatDateFr(payload.jourRappel)}`,
    `Créneau : ${payload.heureRappel}`,
    `Téléphone : ${payload.phone}`,
    `Profession : ${payload.professionLabel}`,
    `Score certification : ${payload.score}/8`,
    payload.message ? `Message du PS : ${payload.message}` : null,
    '—',
    `Demande reçue le ${formatNowFr()}`,
  ].filter(Boolean).join('\n');

  // 2. Mettre à jour les champs standards uniquement
  const patchRes = await fetch(
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
          certification_rdv_demande: rdvText,
        },
      }),
    }
  );

  if (patchRes.ok) {
    console.log('[HUBSPOT] Contact mis à jour:', contactId);
  } else {
    const errBody = await patchRes.text();
    console.error('[HUBSPOT] PATCH failed:', patchRes.status, errBody);
  }
}

export async function POST(req: NextRequest) {
  console.log('[RDV API] Request received');

  let payload: Partial<RdvPayload>;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  console.log('[RDV API] Body:', JSON.stringify(payload));
  console.log('[RDV API] HUBSPOT_API_KEY exists:', !!process.env.HUBSPOT_API_KEY);
  console.log('[RDV API] SLACK_WEBHOOK_URL exists:', !!process.env.SLACK_WEBHOOK_URL);

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
    console.log('[RDV API] Validation failed');
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

  // Lance Slack + HubSpot en parallèle et attend (max 5s)
  // Critique sur Vercel : sans await, les promesses sont tuées au return
  const slackPromise = sendSlackNotification({ type: "rdv", ...fullPayload })
    .catch((err) => console.error('[SLACK] Error:', err));

  const hubspotPromise = updateHubSpotContact(fullPayload)
    .catch((err) => console.error('[HUBSPOT] Error:', err));

  await Promise.race([
    Promise.all([slackPromise, hubspotPromise]),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);

  console.log('[RDV API] Done, returning success');
  return NextResponse.json({ success: true });
}
