// Basic Auth partagée par les routes du dashboard
// Credentials attendus dans DASHBOARD_USER / DASHBOARD_PASSWORD

import type { NextRequest } from "next/server";

export type AuthCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

// Comparaison à temps constant pour éviter les timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function checkDashboardAuth(req: NextRequest): AuthCheck {
  const user = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!user || !password) {
    return { ok: false, status: 403, error: "Dashboard non configuré" };
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) {
    return { ok: false, status: 401, error: "Authentification requise" };
  }

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  } catch {
    return { ok: false, status: 401, error: "En-tête d'authentification invalide" };
  }

  const sep = decoded.indexOf(":");
  const givenUser = sep >= 0 ? decoded.slice(0, sep) : "";
  const givenPass = sep >= 0 ? decoded.slice(sep + 1) : "";

  if (!safeEqual(givenUser, user) || !safeEqual(givenPass, password)) {
    return { ok: false, status: 401, error: "Identifiants incorrects" };
  }

  return { ok: true };
}
