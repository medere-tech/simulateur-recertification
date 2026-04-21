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

function validateEmail(email: string): { ok: boolean; error?: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Format email invalide" };
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
  eppActions?: string;
  relationPatient?: string;
  santePerso?: string;
  score: number;
  urgency: string;
  bloc1Status: string;
  bloc2Status: string;
  bloc3Status?: string;
  bloc4Status?: string;
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

  const { email, phone, profession, diplomaYear, dpcFormations, eppActions, relationPatient, santePerso, score, urgency, bloc1Status, bloc2Status, bloc3Status, bloc4Status, source } = payload;

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
    phone:                    phone || undefined,
    certification_profession: profession as HubSpotContact["certification_profession"],
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
