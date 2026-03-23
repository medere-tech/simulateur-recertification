// POST /api/lead - Créer ou mettre à jour un contact HubSpot
// Rate limit : 10 req/min/IP · Validation serveur email + domaine perso

import { NextRequest, NextResponse } from "next/server";
import { upsertContact, HubSpotContact } from "@/lib/hubspot";
import { CONFIG } from "@/lib/config";

// ─── Rate limiting (in-memory, par instance) ──────────────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX       = 10;

const ipMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now    = Date.now();
  const entry  = ipMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_MAX) return true;
  entry.count++;
  return false;
}

// ─── Validation email (miroir côté serveur) ───────────────────────────────────

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.fr", "yahoo.com", "hotmail.com", "hotmail.fr",
  "outlook.com", "outlook.fr", "live.fr", "live.com", "orange.fr",
  "free.fr", "sfr.fr", "laposte.net", "wanadoo.fr", "icloud.com",
  "me.com", "protonmail.com", "protonmail.ch", "gmx.fr", "gmx.com", "aol.com",
]);

function validateEmail(email: string): { ok: boolean; error?: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Format email invalide" };
  }
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (PERSONAL_DOMAINS.has(domain)) {
    return { ok: false, error: "Email professionnel requis" };
  }
  return { ok: true };
}

// ─── Types de la requête ──────────────────────────────────────────────────────

type LeadPayload = {
  email: string;
  phone?: string;
  profession: string;
  diplomaYear: string;
  dpcFormations: string;
  awareness?: string;
  score: number;
  urgency: string;
  bloc1Status: string;
  bloc2Status: string;
  source?: string;
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  // Parse body
  let payload: LeadPayload;
  try {
    payload = await req.json() as LeadPayload;
  } catch {
    return NextResponse.json({ success: false, error: "Corps de requête invalide" }, { status: 400 });
  }

  const { email, phone, profession, diplomaYear, dpcFormations, awareness, score, urgency, bloc1Status, bloc2Status, source } = payload;

  // Validation email serveur
  const emailCheck = validateEmail(email ?? "");
  if (!emailCheck.ok) {
    return NextResponse.json({ success: false, error: emailCheck.error }, { status: 400 });
  }

  // Champs requis
  if (!profession || !diplomaYear || !dpcFormations || typeof score !== "number") {
    return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 });
  }

  // Construction du contact HubSpot
  const contact: HubSpotContact = {
    email,
    phone:                        phone || undefined,
    certification_score:          score,
    certification_profession:     profession as HubSpotContact["certification_profession"],
    certification_diploma_year:   diplomaYear as HubSpotContact["certification_diploma_year"],
    certification_dpc_formations: dpcFormations as HubSpotContact["certification_dpc_formations"],
    certification_urgency:        (urgency ?? "rouge") as HubSpotContact["certification_urgency"],
    certification_bloc1_status:   (bloc1Status ?? "a_faire") as HubSpotContact["certification_bloc1_status"],
    certification_bloc2_status:   (bloc2Status ?? "a_faire") as HubSpotContact["certification_bloc2_status"],
    certification_awareness:      awareness || undefined,
    certification_source:         source ?? "simulateur_web",
  };

  // ── Feature flag HubSpot ────────────────────────────────────────────────────
  if (!CONFIG.HUBSPOT_ENABLED) {
    console.log("[HUBSPOT DISABLED] Lead data:", payload);
    return NextResponse.json({ success: true, contactId: null });
  }

  const result = await upsertContact(contact);

  if (!result.success) {
    console.error("[api/lead] HubSpot error:", result.error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'enregistrement. Réessayez." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, contactId: result.contactId });
}
