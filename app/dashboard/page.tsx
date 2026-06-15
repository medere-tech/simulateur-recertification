"use client";

// Dashboard temps réel du simulateur - Basic Auth + chargement progressif
// Connexion instantanée (aucun fetch au montage), 2 routes parallèles :
//   /api/dashboard/contacts      → contacts HubSpot + stats de base
//   /api/dashboard/inscriptions  → inscriptions Airtable (croisement + filtre temporel serveur)
// Design aligné sur les tokens du simulateur (tailwind.config.ts / globals.css).

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types (miroir de lib/dashboard.ts) ─────────────────────────────────────────

type Inscription = { formation: string; date: string; specialite: string; numeroDPC: string };
type Contact = {
  id: string;
  email: string;
  name: string;
  phone: string;
  profession: string;
  professionLabel: string;
  created: string;
  simulateurDate: string;
  hasRdv: boolean;
  rdvJour: string;
  rdvCreneau: string;
  rdvMessage: string;
  isInscrit: boolean;
  inscriptions: Inscription[];
};
type Stats = {
  total: number;
  rdvCount: number;
  inscritCount: number;
  withPhone: number;
  conversionRdv: number;
  conversionInscrit: number;
  phonePct: number;
  last30Days: number;
  byProfession: Record<string, number>;
  byMonth: { month: string; leads: number }[];
};
type ContactsResponse = { contacts: Contact[]; stats: Stats };
type InscriptionsMap = Record<string, Inscription[]>;

// ─── Tokens design (EXACTEMENT ceux du simulateur) ──────────────────────────────
// Source : tailwind.config.ts (neutral / specialist / primary) + globals.css

const C = {
  pageBg: "#F9F5F2", // neutral-10
  white: "#FFFFFF", // neutral-0
  border: "#DBD6CD", // neutral-30
  hover: "#F0EAE5", // neutral-20
  text: "#302D2D", // neutral-100
  textSecondary: "#686162", // neutral-60
  muted: "#9C9494", // neutral-40
  primary: "#006E90", // primary
  success: "#2DA131", // success
};

// Carte standard du simulateur : fond blanc, bordure neutre, rounded-xl, pas d'ombre forte
const CARD = "rounded-xl border border-[#DBD6CD] bg-white";

// Couleurs par spécialité = palette "specialist" du simulateur
const PROFESSION_COLORS: Record<string, string> = {
  MG: "#006E90", // general
  CD: "#FECA45", // dentist
  PSY: "#9F84BD", // psychiatrist
  PED: "#17BEBB", // pediatrician
  GO_GM: "#D87DA9", // gynecologist
  Autre: "#2DA131", // others
};
// Texte du badge quand la couleur de fond est trop claire (jaune dentiste)
const PROFESSION_TEXT: Record<string, string> = { CD: "#302D2D" };

const PROFESSION_SHORT: Record<string, string> = {
  MG: "Médecin gén.",
  CD: "Chir.-dentiste",
  PSY: "Psychiatre",
  PED: "Pédiatre",
  GO_GM: "Gynéco-Obs.",
  Autre: "Autre",
};

const PAGE_SIZE = 15;

// ─── Helpers de formatage ───────────────────────────────────────────────────────

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${MOIS[idx] ?? m} ${y.slice(2)}`;
}

// Mois de lancement public du simulateur — aucun mois antérieur n'est affiché
const LAUNCH_YM = "2026-05";

// Groupe les leads par mois selon simulateurDate, à partir du lancement (2026-05)
// jusqu'au mois le plus récent (au minimum le mois courant). Plage continue.
function monthlyFromSimulateur(contacts: Contact[]): { month: string; leads: number; label: string }[] {
  const counts = new Map<string, number>();
  let maxYM = LAUNCH_YM;
  for (const c of contacts) {
    const t = Date.parse(c.simulateurDate);
    if (isNaN(t)) continue;
    const d = new Date(t);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (ym < LAUNCH_YM) continue; // YYYY-MM comparable lexicographiquement
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
    if (ym > maxYM) maxYM = ym;
  }
  // Étend au moins jusqu'au mois courant
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (curYM > maxYM) maxYM = curYM;

  const [sy, sm] = LAUNCH_YM.split("-").map(Number);
  const [ey, em] = maxYM.split("-").map(Number);
  const out: { month: string; leads: number; label: string }[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ month: ym, leads: counts.get(ym) ?? 0, label: formatMonthLabel(ym) });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (isNaN(t)) return iso;
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Format long « 26 mai 2026 » (parcours de conversion)
function formatDateLong(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (isNaN(t)) return iso;
  const d = new Date(t);
  return `${d.getDate()} ${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function professionColor(code: string): string {
  return PROFESSION_COLORS[code] ?? PROFESSION_COLORS.Autre;
}

// Date d'inscription la plus ancienne (= date de conversion) parmi les inscriptions
function earliestInscriptionDate(inscriptions: Inscription[]): string {
  let best = "";
  let bestT = Infinity;
  for (const ins of inscriptions) {
    const t = Date.parse(ins.date);
    if (!isNaN(t) && t < bestT) {
      bestT = t;
      best = ins.date;
    }
  }
  return best;
}

// CSS global injecté par la page : shimmer + masquage du footer du simulateur.
// Présent dans le DOM uniquement quand /dashboard est monté → n'affecte pas les autres pages.
const GLOBAL_CSS = `
@keyframes dash-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.dash-shimmer {
  background: linear-gradient(90deg, #F0EAE5 25%, #F9F5F2 50%, #F0EAE5 75%);
  background-size: 200% 100%;
  animation: dash-shimmer 1.5s infinite;
}
body > footer { display: none !important; }
.dash-tabs { -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
.dash-tabs::-webkit-scrollbar { display: none; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
//  Orchestrateur
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [contactsData, setContactsData] = useState<ContactsResponse | null>(null);
  const [inscriptionsMap, setInscriptionsMap] = useState<InscriptionsMap | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback((header: string) => {
    setSectionError(null);
    setLoadingContacts(true);
    setLoadingInscriptions(true);
    setInscriptionsMap(null);

    // 1) Contacts d'abord (rapide) → débloque KPIs, graphique, onglets Leads/RDV.
    // 2) Inscriptions ensuite, ciblées sur les emails des leads (la table Airtable
    //    est trop volumineuse pour être chargée en entier) → met à jour le reste.
    fetch("/api/dashboard/contacts", { method: "POST", headers: { Authorization: header }, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setAuthHeader(null);
          setContactsData(null);
          setInscriptionsMap(null);
          setLoadingInscriptions(false);
          setLoginError(body.error ?? "Identifiants incorrects");
          return;
        }
        if (!res.ok) {
          setSectionError("Erreur lors du chargement des contacts");
          setLoadingInscriptions(false);
          return;
        }
        const data = (await res.json()) as ContactsResponse;
        setContactsData(data);
        setLastUpdate(new Date());

        // Enchaîne les inscriptions avec email + date de référence simulateur (filtre temporel serveur)
        const refs = data.contacts.map((c) => ({ email: c.email, simulateurDate: c.simulateurDate }));
        fetch("/api/dashboard/inscriptions", {
          method: "POST",
          headers: { Authorization: header, "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ contacts: refs }),
        })
          .then(async (r) => {
            if (!r.ok) {
              setInscriptionsMap({});
              return;
            }
            const json = (await r.json()) as { inscriptionsByEmail: InscriptionsMap };
            setInscriptionsMap(json.inscriptionsByEmail ?? {});
          })
          .catch(() => setInscriptionsMap({}))
          .finally(() => setLoadingInscriptions(false));
      })
      .catch(() => {
        setSectionError("Connexion impossible");
        setLoadingInscriptions(false);
      })
      .finally(() => setLoadingContacts(false));
  }, []);

  const handleLogin = useCallback(
    (user: string, password: string) => {
      const header = "Basic " + btoa(`${user}:${password}`);
      setLoginError(null);
      setAuthHeader(header); // bascule immédiatement vers le dashboard (skeletons)
      load(header);
    },
    [load]
  );

  const onRefresh = useCallback(() => {
    if (authHeader) load(authHeader);
  }, [authHeader, load]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      {!authHeader ? (
        <LoginScreen onLogin={handleLogin} error={loginError} />
      ) : (
        <DashboardView
          contactsData={contactsData}
          inscriptionsMap={inscriptionsMap}
          loadingContacts={loadingContacts}
          loadingInscriptions={loadingInscriptions}
          error={sectionError}
          lastUpdate={lastUpdate}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Écran de connexion (pur, aucun fetch au montage)
// ═══════════════════════════════════════════════════════════════════════════════

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (user: string, password: string) => void;
  error: string | null;
}) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");

  const inputStyle: React.CSSProperties = { border: `1px solid ${C.border}`, borderRadius: 10 };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: C.pageBg }}>
      <div className={`w-full max-w-[400px] rounded-2xl border border-[#DBD6CD] bg-white p-8`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-medere-black.png" alt="Médéré" className="mx-auto h-8 w-auto" />
        <h1 className="mt-6 text-center text-xl font-bold" style={{ color: C.text }}>
          Dashboard
        </h1>
        <p className="mt-1 text-center text-sm" style={{ color: C.muted }}>
          Accès réservé — Simulateur
        </p>

        <form
          className="mt-7 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(user, password);
          }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold" style={{ color: C.text }}>Identifiant</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              className="dash-input w-full px-4 py-2.5 outline-none"
              style={inputStyle}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold" style={{ color: C.text }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="dash-input w-full px-4 py-2.5 outline-none"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "#FDECEC", color: "#CC0000" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl py-3 font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: C.primary }}
          >
            Se connecter
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.dash-input:focus { border-color: ${C.primary} !important; }` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Vue principale
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = "overview" | "leads" | "rdv" | "inscriptions";

function DashboardView({
  contactsData,
  inscriptionsMap,
  loadingContacts,
  loadingInscriptions,
  error,
  lastUpdate,
  onRefresh,
}: {
  contactsData: ContactsResponse | null;
  inscriptionsMap: InscriptionsMap | null;
  loadingContacts: boolean;
  loadingInscriptions: boolean;
  error: string | null;
  lastUpdate: Date | null;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  const baseStats = contactsData?.stats ?? null;
  const inscritReady = inscriptionsMap !== null;
  const busy = loadingContacts || loadingInscriptions;

  // Croisement par email (la map ne contient QUE les inscriptions post-simulateur)
  const contacts = useMemo<Contact[]>(() => {
    const base = contactsData?.contacts ?? [];
    if (!inscriptionsMap) return base;
    return base.map((c) => {
      const ins = inscriptionsMap[c.email];
      return ins && ins.length > 0 ? { ...c, isInscrit: true, inscriptions: ins } : c;
    });
  }, [contactsData, inscriptionsMap]);

  const inscritCount = useMemo(
    () => (inscritReady ? contacts.filter((c) => c.isInscrit).length : null),
    [inscritReady, contacts]
  );
  const conversionInscrit =
    inscritReady && baseStats && baseStats.total > 0
      ? Math.round(((inscritCount ?? 0) / baseStats.total) * 1000) / 10
      : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "leads", label: "Derniers leads" },
    { id: "rdv", label: `Demandes de RDV${baseStats ? ` (${baseStats.rdvCount})` : ""}` },
    { id: "inscriptions", label: `Inscriptions${inscritCount !== null ? ` (${inscritCount})` : ""}` },
  ];

  return (
    <div className="min-h-screen pb-16" style={{ background: C.pageBg }}>
      {/* ── Header (blanc, comme le SiteHeader du simulateur) ── */}
      <header
        className="sticky top-0 z-40 border-b border-[#DBD6CD] bg-white/90 backdrop-blur-[8px]"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-medere-black.png" alt="Médéré" className="h-7 w-auto sm:h-8" />
            <span className="hidden h-5 w-px bg-[#DBD6CD] sm:block" />
            <div>
              <h1 className="text-base font-bold sm:text-lg" style={{ color: C.text }}>
                Dashboard · Simulateur
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                <span className="h-2 w-2 animate-pulse-gentle rounded-full" style={{ background: C.success }} />
                Live
                {lastUpdate && (
                  <span>· {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-[#DBD6CD] bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[#F9F5F2] disabled:opacity-50"
            style={{ color: C.primary }}
          >
            <span className={busy ? "animate-spin" : ""}>↻</span>
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {error && (
          <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: "#FDECEC", color: "#CC0000" }}>
            {error}
          </div>
        )}

        {/* ── KPI cards ── */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total leads" value={baseStats?.total} sub={baseStats ? `+${baseStats.last30Days} ces 30 derniers jours` : ""} loading={loadingContacts && !baseStats} />
          <KpiCard label="Demandes de RDV" value={baseStats?.rdvCount} sub={baseStats ? `${baseStats.conversionRdv}% lead → RDV` : ""} loading={loadingContacts && !baseStats} />
          <KpiCard label="Inscriptions" value={inscritCount ?? undefined} sub={conversionInscrit !== null ? `${conversionInscrit}% lead → inscription` : ""} loading={!inscritReady} />
          <KpiCard label="Leads avec téléphone" value={baseStats?.withPhone} sub={baseStats ? `${baseStats.phonePct}% renseigné` : ""} loading={loadingContacts && !baseStats} />
        </section>

        {/* ── Onglets (flat soulignés, style Settings) ── */}
        <nav className="dash-tabs mt-8 flex flex-nowrap overflow-x-auto overflow-y-hidden border-b border-[#DBD6CD]">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative -mb-px shrink-0 whitespace-nowrap px-5 py-3 text-sm transition-all duration-200"
                style={{
                  color: active ? C.text : C.muted,
                  fontWeight: active ? 600 : 400,
                  borderBottom: `2px solid ${active ? C.primary : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = C.textSecondary;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = C.muted;
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6">
          {tab === "overview" && (
            <OverviewTab contacts={contacts} stats={baseStats} loading={loadingContacts && !baseStats} inscritCount={inscritCount} conversionInscrit={conversionInscrit} />
          )}
          {tab === "leads" && <LeadsTab contacts={contacts} loading={loadingContacts && !contactsData} />}
          {tab === "rdv" && <RdvTab contacts={contacts} loading={loadingContacts && !contactsData} />}
          {tab === "inscriptions" && <InscriptionsTab contacts={contacts} loading={loadingInscriptions && !inscritReady} />}
        </div>
      </main>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function Skel({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`dash-shimmer rounded-lg ${className}`} style={style} />;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, loading }: { label: string; value: number | undefined; sub: string; loading: boolean }) {
  return (
    <div className={`${CARD} p-5`}>
      {loading ? (
        <>
          <Skel className="h-9 w-20" />
          <Skel className="mt-3 h-3 w-28" />
          <Skel className="mt-2 h-2.5 w-24" />
        </>
      ) : (
        <>
          <div className="text-[32px] font-bold leading-none" style={{ color: C.text }}>{value ?? "—"}</div>
          <div className="mt-3 text-[13px] font-semibold uppercase" style={{ color: C.textSecondary, letterSpacing: "0.05em" }}>{label}</div>
          {sub && <div className="mt-1 text-[12px]" style={{ color: C.muted }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ProfessionBadge({ code, label }: { code: string; label: string }) {
  const color = professionColor(code);
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}26`, color: PROFESSION_TEXT[code] ?? color }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ active, on, off }: { active: boolean; on: string; off: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={active ? { backgroundColor: `${C.success}26`, color: C.success } : { backgroundColor: `${C.muted}26`, color: C.muted }}
    >
      {active ? on : off}
    </span>
  );
}

// ─── Tooltip Recharts ─────────────────────────────────────────────────────────

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  boxShadow: "0 2px 10px rgba(48,45,45,0.08)",
  fontSize: 13,
};

// ─── Pagination ─────────────────────────────────────────────────────────────────

function pageItems(current: number, count: number): (number | string)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items: (number | string)[] = [1];
  if (current > 3) items.push("…l");
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (current < count - 2) items.push("…r");
  items.push(count);
  return items;
}

function Pagination({
  page,
  count,
  total,
  label,
  onChange,
}: {
  page: number;
  count: number;
  total: number;
  label: string;
  onChange: (p: number) => void;
}) {
  const btn =
    "min-w-[36px] rounded-lg border border-[#DBD6CD] bg-white px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-[#F9F5F2] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm" style={{ color: C.textSecondary }}>
        {total} {label} au total
      </span>

      {count > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm" style={{ color: C.muted }}>
            Page {page} sur {count}
          </span>
          <button className={btn} style={{ color: C.text }} onClick={() => onChange(page - 1)} disabled={page === 1}>
            Précédent
          </button>
          {pageItems(page, count).map((it, i) =>
            typeof it === "string" ? (
              <span key={`e${i}`} className="px-1 text-sm" style={{ color: C.muted }}>
                …
              </span>
            ) : (
              <button
                key={it}
                onClick={() => onChange(it)}
                className={btn}
                style={it === page ? { background: C.primary, color: "#fff", borderColor: C.primary } : { color: C.text }}
              >
                {it}
              </button>
            )
          )}
          <button className={btn} style={{ color: C.text }} onClick={() => onChange(page + 1)} disabled={page === count}>
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

// Hook de pagination : page courante + clamp quand la liste change de taille
function usePagination(length: number, deps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const count = Math.max(1, Math.ceil(length / PAGE_SIZE));
  // Réinitialise quand les dépendances (tri, données) changent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), deps);
  useEffect(() => {
    if (page > count) setPage(count);
  }, [count, page]);
  const start = (page - 1) * PAGE_SIZE;
  return { page, setPage, count, start, end: start + PAGE_SIZE };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Onglet 1 — Vue d'ensemble
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({
  contacts,
  stats,
  loading,
  inscritCount,
  conversionInscrit,
}: {
  contacts: Contact[];
  stats: Stats | null;
  loading: boolean;
  inscritCount: number | null;
  conversionInscrit: number | null;
}) {
  // Leads par mois basés sur simulateurDate, uniquement à partir du lancement (2026-05)
  const monthData = useMemo(() => monthlyFromSimulateur(contacts), [contacts]);
  const professionData = useMemo(
    () =>
      stats
        ? Object.entries(stats.byProfession)
            .filter(([, n]) => n > 0)
            .map(([code, n]) => ({ code, name: PROFESSION_SHORT[code] ?? code, value: n }))
        : [],
    [stats]
  );

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <Skel className="mb-4 h-4 w-48" />
          <Skel className="h-64 w-full" />
        </div>
        <div className={`${CARD} p-5`}>
          <Skel className="mb-4 h-4 w-40" />
          <Skel className="h-64 w-full" />
        </div>
        <div className={`${CARD} p-5`}>
          <Skel className="mb-4 h-4 w-40" />
          <Skel className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Bar chart — leads par mois */}
      <div className={`${CARD} p-5 lg:col-span-2`}>
        <h2 className="mb-4 font-bold" style={{ color: C.text }}>Leads par mois (depuis le lancement)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.hover} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: C.hover }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="leads" name="Leads" fill={C.primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut — répartition par spécialité */}
      <div className={`${CARD} p-5`}>
        <h2 className="mb-4 font-bold" style={{ color: C.text }}>Répartition par spécialité</h2>
        {professionData.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: C.muted }}>Aucune donnée</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={professionData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                  {professionData.map((d) => (
                    <Cell key={d.code} fill={professionColor(d.code)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className={`${CARD} p-5`}>
        <h2 className="mb-4 font-bold" style={{ color: C.text }}>Tunnel de conversion</h2>
        <Funnel stats={stats} inscritCount={inscritCount} conversionInscrit={conversionInscrit} />
      </div>
    </div>
  );
}

function Funnel({ stats, inscritCount, conversionInscrit }: { stats: Stats; inscritCount: number | null; conversionInscrit: number | null }) {
  const max = Math.max(stats.total, 1);
  const steps = [
    { label: "Total leads", value: stats.total, color: C.primary, pct: 100, pending: false },
    { label: "RDV demandés", value: stats.rdvCount, color: "#D87DA9", pct: stats.conversionRdv, pending: false },
    { label: "Inscrits", value: inscritCount, color: C.success, pct: conversionInscrit, pending: inscritCount === null },
  ];

  return (
    <div className="space-y-4 py-2">
      {steps.map((s) => (
        <div key={s.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-semibold" style={{ color: C.text }}>{s.label}</span>
            {s.pending ? <Skel className="h-3 w-16" /> : <span style={{ color: C.muted }}>{s.value} · {s.pct}%</span>}
          </div>
          {s.pending ? (
            <Skel className="h-7 w-full" />
          ) : (
            <div className="h-7 w-full overflow-hidden rounded-lg" style={{ background: C.pageBg }}>
              <div className="h-full rounded-lg transition-all" style={{ width: `${Math.max(((s.value ?? 0) / max) * 100, (s.value ?? 0) > 0 ? 4 : 0)}%`, backgroundColor: s.color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Onglet 2 — Derniers leads
// ═══════════════════════════════════════════════════════════════════════════════

type SortKey = "name" | "email" | "professionLabel" | "phone" | "simulateurDate" | "hasRdv" | "isInscrit";

function LeadsTab({ contacts, loading }: { contacts: Contact[]; loading: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("simulateurDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...contacts];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "simulateurDate") cmp = (Date.parse(a.simulateurDate) || 0) - (Date.parse(b.simulateurDate) || 0);
      else if (sortKey === "hasRdv" || sortKey === "isInscrit") cmp = Number(a[sortKey]) - Number(b[sortKey]);
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [contacts, sortKey, sortDir]);

  const { page, setPage, count, start, end } = usePagination(sorted.length, [sortKey, sortDir, contacts.length]);

  if (loading) return <TableSkeleton />;

  const rows = sorted.slice(start, end);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "professionLabel", label: "Spécialité" },
    { key: "phone", label: "Téléphone" },
    { key: "simulateurDate", label: "Simulateur" },
    { key: "hasRdv", label: "RDV" },
    { key: "isInscrit", label: "Inscription" },
  ];

  return (
    <div>
      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr style={{ background: C.hover }}>
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-left">
                    <button onClick={() => toggleSort(c.key)} className="text-[11px] font-semibold uppercase" style={{ color: C.textSecondary, letterSpacing: "0.04em" }}>
                      {c.label}
                      {arrow(c.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? C.white : C.pageBg }}>
                  <td className="px-3 py-3 font-semibold" style={{ color: C.text }}>{c.name}</td>
                  <td className="px-3 py-3" style={{ color: C.textSecondary }}>{c.email}</td>
                  <td className="px-3 py-3"><ProfessionBadge code={c.profession} label={c.professionLabel} /></td>
                  <td className="px-3 py-3" style={{ color: C.textSecondary }}>{c.phone || "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ color: C.muted }}>{formatDate(c.simulateurDate)}</td>
                  <td className="px-3 py-3"><StatusBadge active={c.hasRdv} on="RDV" off="—" /></td>
                  <td className="px-3 py-3"><StatusBadge active={c.isInscrit} on="Inscrit" off="—" /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-3 py-12 text-center" style={{ color: C.muted }}>Aucun lead pour le moment</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} count={count} total={sorted.length} label="leads" onChange={setPage} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className={`${CARD} p-4`}>
      <Skel className="h-9 w-full" />
      <div className="mt-3 space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skel key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Onglet 3 — Demandes de RDV
// ═══════════════════════════════════════════════════════════════════════════════

function RdvTab({ contacts, loading }: { contacts: Contact[]; loading: boolean }) {
  const rdvContacts = useMemo(
    () => contacts.filter((c) => c.hasRdv).sort((a, b) => (Date.parse(b.simulateurDate) || 0) - (Date.parse(a.simulateurDate) || 0)),
    [contacts]
  );
  const { page, setPage, count, start, end } = usePagination(rdvContacts.length, [contacts.length]);

  if (loading) return <CardsSkeleton />;
  if (rdvContacts.length === 0) return <EmptyState message="Aucune demande de RDV pour le moment." />;

  const rows = rdvContacts.slice(start, end);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className={`${CARD} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold" style={{ color: C.text }}>{c.name}</h3>
                <ProfessionBadge code={c.profession} label={c.professionLabel} />
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#D87DA926", color: "#B05683" }}>RDV demandé</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Email" value={c.email} />
              <Row label="Téléphone" value={c.phone || "—"} />
              <Row label="Passage simulateur" value={formatDate(c.simulateurDate)} />
              <Row label="Jour souhaité" value={c.rdvJour || "—"} />
              <Row label="Créneau" value={c.rdvCreneau || "—"} />
            </dl>
            {c.rdvMessage && (
              <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: C.pageBg, color: C.text }}>
                <span className="font-semibold" style={{ color: C.muted }}>Message du PS : </span>
                {c.rdvMessage}
              </div>
            )}
            {c.isInscrit && <div className="mt-3"><StatusBadge active on="Converti en inscription" off="" /></div>}
          </div>
        ))}
      </div>
      <Pagination page={page} count={count} total={rdvContacts.length} label="demandes de RDV" onChange={setPage} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Onglet 4 — Inscriptions
// ═══════════════════════════════════════════════════════════════════════════════

function InscriptionsTab({ contacts, loading }: { contacts: Contact[]; loading: boolean }) {
  const inscrits = useMemo(
    () => contacts.filter((c) => c.isInscrit).sort((a, b) => (Date.parse(b.simulateurDate) || 0) - (Date.parse(a.simulateurDate) || 0)),
    [contacts]
  );
  const { page, setPage, count, start, end } = usePagination(inscrits.length, [contacts.length]);

  if (loading) return <CardsSkeleton />;
  if (inscrits.length === 0) return <EmptyState message="Aucune inscription détectée pour les leads du simulateur." />;

  const rows = inscrits.slice(start, end);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className={`${CARD} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold" style={{ color: C.text }}>{c.name}</h3>
                <ProfessionBadge code={c.profession} label={c.professionLabel} />
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${C.success}26`, color: C.success }}>✓ Converti</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Email" value={c.email} />
              <Row label="Téléphone" value={c.phone || "—"} />
            </dl>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold" style={{ color: C.muted }}>
                Formation{c.inscriptions.length > 1 ? "s" : ""} inscrite{c.inscriptions.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {c.inscriptions.map((ins, i) => (
                  <div key={i} className="rounded-lg p-3 text-sm" style={{ border: `1px solid ${C.border}`, background: C.pageBg }}>
                    <p className="font-semibold" style={{ color: C.text }}>{ins.formation || "Formation"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: C.muted }}>
                      {ins.specialite && <span>Spécialité : {ins.specialite}</span>}
                      {ins.numeroDPC && <span>DPC : {ins.numeroDPC}</span>}
                      {ins.date && <span>Inscrit le {formatDate(ins.date)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs" style={{ color: C.muted }}>
              Simulateur le {formatDateLong(c.simulateurDate)} → Inscrit le {formatDateLong(earliestInscriptionDate(c.inscriptions))}
            </p>
          </div>
        ))}
      </div>
      <Pagination page={page} count={count} total={inscrits.length} label="inscriptions" onChange={setPage} />
    </div>
  );
}

// ─── Composants partagés ────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt style={{ color: C.muted }}>{label}</dt>
      <dd className="text-right font-medium" style={{ color: C.text }}>{value}</dd>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${CARD} p-5`}>
          <Skel className="h-5 w-40" />
          <Skel className="mt-3 h-3 w-24" />
          <div className="mt-4 space-y-2">
            <Skel className="h-3 w-full" />
            <Skel className="h-3 w-5/6" />
            <Skel className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className={`${CARD} p-12 text-center`}>
      <p style={{ color: C.muted }}>{message}</p>
    </div>
  );
}
