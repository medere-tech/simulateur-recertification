// Template React-PDF — Rapport personnalisé (6 pages)
// Rendu côté serveur uniquement — Node.js runtime

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { PROFESSIONS, type ProfessionId } from "../professions";
import type { DiplomaYear, DimensionStatus, Urgency } from "../scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportTemplateProps = {
  profession: ProfessionId;
  diplomaYear: DiplomaYear;
  score: number;
  urgency: Urgency;
  bloc1Status: DimensionStatus;
  bloc2Status: DimensionStatus;
  logoDataUri: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<Urgency, string> = {
  rouge: "#CC0000",
  orange: "#EA6C00",
  vert: "#2DA131",
};

const URGENCY_LABELS: Record<Urgency, string> = {
  rouge: "Situation critique",
  orange: "En cours de constitution",
  vert: "Bien avancé",
};

const STATUS_LABELS: Record<DimensionStatus, string> = {
  valide: "Validé ✓",
  en_cours: "En cours",
  a_faire: "À faire",
};

const STATUS_COLORS: Record<DimensionStatus, string> = {
  valide: "#2DA131",
  en_cours: "#EA6C00",
  a_faire: "#CC0000",
};

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const PROFESSION_CONSTRAINTS: Partial<Record<ProfessionId, string>> = {
  MG: "18 pratiques sont exclues (homéopathie, ostéopathie, naturopathie…)",
  CD: "Toutes les formations doivent avoir une durée minimale de 6 heures",
  PED: "En pédiatrie, 2 actions DPC comptent pour 1 action de certification",
  PSY: "Le e-learning Qualiopi est explicitement validant pour l'Axe 1",
  GO: "L'accréditation HAS via GYNERISQ couvre les Blocs 1, 2 et 3",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentDate(): string {
  const now = new Date();
  return `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
}

function getCycleYears(profession: ProfessionId, diplomaYear: DiplomaYear): string {
  const isLongCycle =
    (profession === "MG" || profession === "CD") && diplomaYear !== "apres_2023";
  return isLongCycle ? "9" : "6";
}

function getEcheanceYear(profession: ProfessionId, diplomaYear: DiplomaYear): number {
  if (diplomaYear === "apres_2023") return 2030;
  return profession === "MG" || profession === "CD" ? 2032 : 2029;
}

function getBlocScore(status: DimensionStatus): number {
  if (status === "valide") return 2;
  if (status === "en_cours") return 1;
  return 0;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // ── Header / Footer
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerLogo: { width: 88, height: 28 },
  pageNum: { fontSize: 9, color: "#AAAAAA" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  footerText: { fontSize: 7.5, color: "#AAAAAA", textAlign: "center" },

  // ── Cover
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 0,
  },
  coverBand: { height: 80 },
  coverBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 40,
    paddingBottom: 40,
  },
  coverLogo: { width: 152, height: 48, marginBottom: 36, objectFit: "contain" },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 1.3,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#444444",
    textAlign: "center",
    marginBottom: 8,
  },
  coverDate: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginBottom: 36,
  },
  coverBadge: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 18,
    paddingRight: 18,
    borderRadius: 4,
    marginBottom: 36,
  },
  coverBadgeText: { fontSize: 10, color: "#555555", textAlign: "center" },
  coverConfidential: { fontSize: 9, color: "#BBBBBB", textAlign: "center" },
  coverFooter: {
    paddingTop: 8,
    paddingBottom: 18,
    paddingLeft: 40,
    paddingRight: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  coverFooterText: { fontSize: 7.5, color: "#AAAAAA", textAlign: "center" },

  // ── Standard page
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
  },

  // ── Typography
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1A1A1A",
    marginBottom: 18,
  },
  subTitle: {
    fontSize: 12,
    color: "#555555",
    marginBottom: 18,
    lineHeight: 1.4,
  },
  body: { fontSize: 10, color: "#333333", lineHeight: 1.55, marginBottom: 12 },
  bodySmall: { fontSize: 9, color: "#555555", lineHeight: 1.45 },

  // ── Score area
  scoreArea: { alignItems: "center", marginBottom: 22 },
  scoreBig: { fontSize: 52, fontFamily: "Helvetica-Bold", textAlign: "center" },
  scoreLabel: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 10,
  },
  urgencyBadge: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 18,
    paddingRight: 18,
    borderRadius: 4,
    marginBottom: 8,
  },
  urgencyBadgeText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  echeanceText: {
    fontSize: 11,
    color: "#555555",
    textAlign: "center",
    marginTop: 4,
  },

  // ── Dimensions table
  table: { marginBottom: 22, borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 3 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F4F4F4",
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 10,
    paddingRight: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  colDim: { flex: 3 },
  colStatus: { flex: 1.8 },
  colScore: { flex: 0.8, textAlign: "right" },
  thText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#666666" },
  tdDimLabel: { fontSize: 8, color: "#999999", marginBottom: 2 },
  tdDimName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#222222" },
  tdStatus: { fontSize: 10 },
  tdScore: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },

  // ── Info boxes
  infoBox: {
    backgroundColor: "#F8F9FA",
    borderLeftWidth: 4,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 14,
    borderRadius: 2,
  },
  infoBoxTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginBottom: 5,
  },
  infoBoxText: { fontSize: 9.5, color: "#444444", lineHeight: 1.5 },
  alertBox: {
    borderWidth: 1,
    borderColor: "#CC0000",
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 14,
    borderRadius: 2,
  },
  alertText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#CC0000",
    lineHeight: 1.5,
  },
  warningBox: {
    backgroundColor: "#FFF8EE",
    borderLeftWidth: 4,
    borderLeftColor: "#EA6C00",
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 14,
    borderRadius: 2,
  },
  warningText: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#444444",
    lineHeight: 1.5,
  },

  // ── Bullet list
  bulletRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-start" },
  bulletDot: { width: 18, fontSize: 18, color: "#2DA131", marginTop: -4, lineHeight: 1 },
  bulletText: { flex: 1, fontSize: 10.5, color: "#333333", lineHeight: 1.5 },

  // ── Criteria list (page 6)
  criteriaRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  criteriaCheck: { width: 20, fontSize: 11, color: "#2DA131" },
  criteriaText: { flex: 1, fontSize: 10, color: "#333333", lineHeight: 1.45 },

  // ── CTA
  ctaBox: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 22,
    paddingRight: 22,
    borderRadius: 4,
    marginBottom: 18,
  },
  ctaTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    marginBottom: 14,
    textAlign: "center",
  },
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  contactLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", width: 54 },
  contactValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  // ── Legal
  legalText: { fontSize: 8, color: "#AAAAAA", lineHeight: 1.45, textAlign: "center" },

  // ── Page 6 logo
  aboutLogo: { width: 120, height: 38, marginBottom: 16, objectFit: "contain" },
  aboutIntro: {
    fontSize: 10.5,
    color: "#333333",
    lineHeight: 1.55,
    marginBottom: 18,
    fontFamily: "Helvetica-Oblique",
  },
  aboutTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
});

// ─── Shared components ────────────────────────────────────────────────────────

function Header({
  logoDataUri,
  pageNum,
}: {
  logoDataUri: string;
  pageNum: number;
}) {
  return (
    <View style={S.header}>
      <Image src={logoDataUri} style={S.headerLogo} />
      <Text style={S.pageNum}>Page {pageNum} / 6</Text>
    </View>
  );
}

function Footer({ date }: { date: string }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>
        Médéré — Document confidentiel — {date}
      </Text>
    </View>
  );
}

// ─── Page 1 : Couverture ──────────────────────────────────────────────────────

function Page1Cover({
  profession,
  logoDataUri,
  date,
}: {
  profession: ProfessionId;
  logoDataUri: string;
  date: string;
}) {
  const prof = PROFESSIONS[profession];
  return (
    <Page size="A4" style={S.coverPage}>
      <View style={[S.coverBand, { backgroundColor: prof.color }]} />
      <View style={S.coverBody}>
        <Image src={logoDataUri} style={S.coverLogo} />
        <Text style={S.coverTitle}>
          Votre diagnostic{"\n"}certification périodique
        </Text>
        <Text style={S.coverSubtitle}>{prof.label}</Text>
        <Text style={S.coverDate}>{date}</Text>
        <View style={S.coverBadge}>
          <Text style={S.coverBadgeText}>
            Organisme certifié DPC n°9262 • Qualiopi
          </Text>
        </View>
        <Text style={S.coverConfidential}>Document personnalisé — Confidentiel</Text>
      </View>
      <View style={S.coverFooter}>
        <Text style={S.coverFooterText}>
          Médéré — Document confidentiel — {date}
        </Text>
      </View>
    </Page>
  );
}

// ─── Page 2 : Votre situation ─────────────────────────────────────────────────

function Page2Situation({
  profession,
  diplomaYear,
  score,
  urgency,
  bloc1Status,
  bloc2Status,
  logoDataUri,
  date,
}: ReportTemplateProps & { date: string }) {
  const prof = PROFESSIONS[profession];
  const dimLabel = prof.dimensionLabel;
  const urgencyColor = URGENCY_COLORS[urgency];
  const echeance = getEcheanceYear(profession, diplomaYear);
  const bloc1Score = getBlocScore(bloc1Status);
  const bloc2Score = getBlocScore(bloc2Status);

  const rows = [
    {
      dim: prof.dimensions[0],
      status: bloc1Status,
      score: bloc1Score,
      isNew: false,
    },
    {
      dim: prof.dimensions[1],
      status: bloc2Status,
      score: bloc2Score,
      isNew: false,
    },
    { dim: prof.dimensions[2], status: null, score: 0, isNew: true },
    { dim: prof.dimensions[3], status: null, score: 0, isNew: true },
  ];

  return (
    <Page size="A4" style={S.page}>
      <Header logoDataUri={logoDataUri} pageNum={2} />

      <Text style={S.sectionTitle}>Votre diagnostic</Text>

      {/* Score */}
      <View style={S.scoreArea}>
        <Text style={[S.scoreBig, { color: urgencyColor }]}>{score}/8</Text>
        <Text style={S.scoreLabel}>actions validées sur 8 requises</Text>
        <View style={[S.urgencyBadge, { backgroundColor: urgencyColor }]}>
          <Text style={S.urgencyBadgeText}>{URGENCY_LABELS[urgency]}</Text>
        </View>
        <Text style={S.echeanceText}>
          Vous avez jusqu'en {echeance} pour compléter vos 8 actions
        </Text>
      </View>

      {/* Dimensions table */}
      <View style={S.table}>
        <View style={S.tableHeaderRow}>
          <Text style={[S.thText, S.colDim]}>{dimLabel}</Text>
          <Text style={[S.thText, S.colStatus]}>Statut</Text>
          <Text style={[S.thText, S.colScore, { textAlign: "right" }]}>
            Score
          </Text>
        </View>
        {rows.map((row, i) => (
          <View key={row.dim.id} style={[S.tableRow, i % 2 === 1 ? { backgroundColor: "#FAFAFA" } : {}]}>
            <View style={S.colDim}>
              <Text style={S.tdDimLabel}>
                {dimLabel} {row.dim.id}
              </Text>
              <Text style={S.tdDimName}>{row.dim.name}</Text>
            </View>
            {row.isNew ? (
              <Text style={[S.tdStatus, S.colStatus, { color: "#CC0000" }]}>
                Nouveau — À faire
              </Text>
            ) : (
              <Text
                style={[
                  S.tdStatus,
                  S.colStatus,
                  { color: STATUS_COLORS[row.status as DimensionStatus] },
                ]}
              >
                {STATUS_LABELS[row.status as DimensionStatus]}
              </Text>
            )}
            <Text
              style={[
                S.tdScore,
                S.colScore,
                { color: row.isNew ? "#CC0000" : STATUS_COLORS[row.status as DimensionStatus] },
              ]}
            >
              {row.score}/2
            </Text>
          </View>
        ))}
      </View>

      {/* Context note */}
      <View style={[S.infoBox, { borderLeftColor: prof.color }]}>
        <Text style={S.infoBoxText}>
          Les {prof.dimensionLabelPlural} 3 & 4 sont entièrement nouveaux dans
          ce cycle. Tous les praticiens partent de zéro pour ces 4 actions.
          Médéré ne propose pas encore de formations pour ces {prof.dimensionLabelPlural.toLowerCase()}.
        </Text>
      </View>

      <Footer date={date} />
    </Page>
  );
}

// ─── Page 3 : Ce que dit le référentiel ──────────────────────────────────────

function Page3Referentiel({
  profession,
  diplomaYear,
  logoDataUri,
  date,
}: {
  profession: ProfessionId;
  diplomaYear: DiplomaYear;
  logoDataUri: string;
  date: string;
}) {
  const prof = PROFESSIONS[profession];
  const cycleYears = getCycleYears(profession, diplomaYear);
  const dimLabel = prof.dimensionLabel.toLowerCase();
  const dimLabelPlural = prof.dimensionLabelPlural.toLowerCase();
  const constraint = PROFESSION_CONSTRAINTS[profession];

  return (
    <Page size="A4" style={S.page}>
      <Header logoDataUri={logoDataUri} pageNum={3} />

      <Text style={S.sectionTitle}>
        Ce que le référentiel exige{"\n"}pour les {prof.label}s
      </Text>

      <Text style={S.body}>
        L'arrêté du 26 février 2026 (NOR : SFHH2605575A) définit 8 actions
        obligatoires réparties sur 4 {dimLabelPlural}. Chaque {dimLabel} requiert
        au minimum 2 actions validées sur votre cycle de {cycleYears} ans.
      </Text>

      {constraint && (
        <View style={[S.infoBox, { borderLeftColor: URGENCY_COLORS.orange }]}>
          <Text style={S.infoBoxTitle}>Contrainte spécifique à votre profession</Text>
          <Text style={S.infoBoxText}>{constraint}</Text>
        </View>
      )}

      <View style={[S.infoBox, { borderLeftColor: "#CC0000" }]}>
        <Text style={S.infoBoxTitle}>
          {prof.dimensionLabelPlural} 3 et 4 — 100 % nouveaux
        </Text>
        <Text style={S.infoBoxText}>
          Les {prof.dimensionLabelPlural} 3 et 4 sont entièrement nouveaux.
          Aucune formation DPC antérieure à 2023 ne les couvre. 100 % des
          praticiens partent de zéro.
        </Text>
      </View>

      <Text style={[S.body, { marginTop: 4 }]}>
        Détail des 4 {dimLabelPlural} pour les {prof.label}s :
      </Text>

      <View style={S.table}>
        {prof.dimensions.map((dim, i) => (
          <View key={dim.id} style={[S.tableRow, i === 0 ? { borderTopWidth: 0 } : {}, i % 2 === 1 ? { backgroundColor: "#FAFAFA" } : {}]}>
            <View style={S.colDim}>
              <Text style={S.tdDimLabel}>
                {prof.dimensionLabel} {dim.id}
              </Text>
              <Text style={S.tdDimName}>{dim.name}</Text>
            </View>
            <Text style={[S.colStatus, { fontSize: 9, color: dim.medereCovers ? "#2DA131" : "#888888" }]}>
              {dim.medereCovers ? "Couvert par Médéré" : "Hors catalogue Médéré"}
            </Text>
            <Text style={[S.colScore, { fontSize: 10, color: "#555555", textAlign: "right" }]}>
              2 actions min.
            </Text>
          </View>
        ))}
      </View>

      <Text style={[S.bodySmall, { color: "#888888" }]}>
        Référence : Arrêté du 26 février 2026 — NOR : SFHH2605575A —{" "}
        {prof.annexe}
      </Text>

      <Footer date={date} />
    </Page>
  );
}

// ─── Page 4 : Formations Médéré ───────────────────────────────────────────────

function Page4Formations({
  profession,
  logoDataUri,
  date,
}: {
  profession: ProfessionId;
  logoDataUri: string;
  date: string;
}) {
  const prof = PROFESSIONS[profession];

  return (
    <Page size="A4" style={S.page}>
      <Header logoDataUri={logoDataUri} pageNum={4} />

      <Text style={S.sectionTitle}>
        Formations Médéré éligibles{"\n"}à votre certification
      </Text>

      <Text style={S.subTitle}>
        {prof.dimensionLabelPlural} 1 & 2 — Pris en charge sans avance de frais
        via l'ANDPC
      </Text>

      {/* Placeholder */}
      <View style={[S.infoBox, { borderLeftColor: prof.color }]}>
        <Text style={S.infoBoxTitle}>Catalogue en cours de mise à jour</Text>
        <Text style={S.infoBoxText}>
          Nos formations adaptées à votre profil ({prof.label}) seront
          disponibles prochainement. Consultez notre catalogue sur medere.fr ou
          contactez-nous au 01 88 33 95 28 pour connaître les sessions ouvertes.
        </Text>
      </View>

      {/* What to expect */}
      <Text style={[S.body, { marginTop: 8 }]}>
        Nos formations pour les {prof.dimensionLabelPlural.toLowerCase()} 1 & 2
        couvrent :
      </Text>

      <View style={S.bulletRow}>
        <Text style={S.bulletDot}>•</Text>
        <Text style={S.bulletText}>
          {prof.dimensions[0].name} — {prof.dimensionLabel} 1
        </Text>
      </View>
      <View style={S.bulletRow}>
        <Text style={S.bulletDot}>•</Text>
        <Text style={S.bulletText}>
          {prof.dimensions[1].name} — {prof.dimensionLabel} 2
        </Text>
      </View>

      {/* Info encadré */}
      <View style={[S.infoBox, { borderLeftColor: "#2DA131", marginTop: 12 }]}>
        <Text style={S.infoBoxTitle}>Prise en charge ANDPC</Text>
        <Text style={S.infoBoxText}>
          Nos formations sont éligibles à votre certification périodique et
          financées par l'ANDPC — sans avance de frais de votre part. Seuls le
          CNP et l'Ordre valident définitivement en fin de cycle.
        </Text>
      </View>

      <View style={[S.infoBox, { borderLeftColor: "#888888" }]}>
        <Text style={S.infoBoxTitle}>Pour les {prof.dimensionLabelPlural} 3 & 4</Text>
        <Text style={S.infoBoxText}>
          Ces {prof.dimensionLabelPlural.toLowerCase()} étant entièrement nouveaux
          (aucune offre existante avant 2023), Médéré développe actuellement des
          formations spécifiques. Contactez-nous pour être informé en priorité.
        </Text>
      </View>

      <Footer date={date} />
    </Page>
  );
}

// ─── Page 5 : Pourquoi agir maintenant ───────────────────────────────────────

function Page5WhyNow({
  logoDataUri,
  date,
}: {
  logoDataUri: string;
  date: string;
}) {
  const bullets = [
    "L'obligation est en vigueur depuis le 1er janvier 2023",
    "2026 est probablement la dernière année de financement ANDPC",
    "En 2025, les budgets ont été épuisés dès septembre",
    "Pris en charge sans avance de frais — pas un centime à avancer",
  ];

  return (
    <Page size="A4" style={S.page}>
      <Header logoDataUri={logoDataUri} pageNum={5} />

      <Text style={S.sectionTitle}>Pourquoi agir en 2026</Text>

      <Text style={S.body}>
        La certification périodique n'est pas une recommandation — c'est une
        obligation légale. Voici pourquoi ne pas attendre :
      </Text>

      {bullets.map((text, i) => (
        <View key={i} style={S.bulletRow}>
          <Text style={[S.bulletDot, { color: "#2DA131" }]}>•</Text>
          <Text style={S.bulletText}>{text}</Text>
        </View>
      ))}

      <View style={S.warningBox}>
        <Text style={S.warningText}>
          Chaque semaine qui passe = une place en moins + un risque de
          financement personnel en plus.
        </Text>
      </View>

      <View style={[S.infoBox, { borderLeftColor: "#006E90", marginTop: 4 }]}>
        <Text style={S.infoBoxTitle}>Le calendrier ANDPC en pratique</Text>
        <Text style={S.infoBoxText}>
          L'ANDPC attribue les budgets en début d'année civile. Une fois les
          enveloppes épuisées, toute formation réalisée reste à votre charge.
          Les places dans les sessions éligibles sont limitées et s'épuisent
          rapidement — particulièrement pour les spécialités comme la pédiatrie
          et la psychiatrie.
        </Text>
      </View>

      <View style={[S.alertBox, { marginTop: 8 }]}>
        <Text style={S.alertText}>
          Rappel réglementaire : en cas de non-respect de vos obligations de
          certification périodique, votre Ordre peut engager une procédure
          disciplinaire. Ce document vous aide à anticiper — agissez maintenant.
        </Text>
      </View>

      <Footer date={date} />
    </Page>
  );
}

// ─── Page 6 : À propos de Médéré + CTA ───────────────────────────────────────

function Page6About({
  profession,
  logoDataUri,
  date,
}: {
  profession: ProfessionId;
  logoDataUri: string;
  date: string;
}) {
  const prof = PROFESSIONS[profession];

  const criteria = [
    "Comité scientifique identifié — fondateur médecin (Dr Harry Sitbon)",
    "Déclarations publiques d'intérêts de tous les intervenants",
    "Aucun lien financier avec l'industrie pharmaceutique",
    "Méthodes HAS de référence — Qualiopi certifié",
  ];

  return (
    <Page size="A4" style={S.page}>
      <Header logoDataUri={logoDataUri} pageNum={6} />

      <Image src={logoDataUri} style={S.aboutLogo} />

      <Text style={S.aboutIntro}>
        Médéré est le seul organisme de formation fondé et dirigé par un
        médecin, le Dr Harry Sitbon, qui ne vend que des formations conformes
        aux référentiels officiels de certification périodique.
      </Text>

      <Text style={S.aboutTitle}>Nos garanties réglementaires</Text>

      {criteria.map((text, i) => (
        <View key={i} style={S.criteriaRow}>
          <Text style={S.criteriaCheck}>✓</Text>
          <Text style={S.criteriaText}>{text}</Text>
        </View>
      ))}

      {/* CTA */}
      <View style={[S.ctaBox, { backgroundColor: prof.color, marginTop: 16 }]}>
        <Text style={S.ctaTitle}>
          Prenez rendez-vous avec un conseiller Médéré
        </Text>
        <View style={S.contactRow}>
          <Text style={S.contactLabel}>Tél.</Text>
          <Text style={S.contactValue}>01 88 33 95 28</Text>
        </View>
        <View style={S.contactRow}>
          <Text style={S.contactLabel}>Email</Text>
          <Text style={S.contactValue}>contact@medere.fr</Text>
        </View>
        <View style={S.contactRow}>
          <Text style={S.contactLabel}>Web</Text>
          <Text style={S.contactValue}>medere.fr</Text>
        </View>
      </View>

      {/* Legal */}
      <Text style={S.legalText}>
        Basé sur l'arrêté du 26 février 2026 — NOR : SFHH2605575A. Ce document
        est une estimation indicative. La validation finale de votre
        certification est prononcée par votre Ordre professionnel.
      </Text>

      <Footer date={date} />
    </Page>
  );
}

// ─── Document principal ───────────────────────────────────────────────────────

export function ReportTemplate(props: ReportTemplateProps) {
  const { profession, diplomaYear, score, urgency, bloc1Status, bloc2Status, logoDataUri } =
    props;
  const date = getCurrentDate();

  return (
    <Document
      title={`Diagnostic certification périodique — ${PROFESSIONS[profession].label}`}
      author="Médéré"
      subject="Certification périodique obligatoire"
      keywords="certification, DPC, ANDPC, Médéré"
    >
      <Page1Cover profession={profession} logoDataUri={logoDataUri} date={date} />
      <Page2Situation
        profession={profession}
        diplomaYear={diplomaYear}
        score={score}
        urgency={urgency}
        bloc1Status={bloc1Status}
        bloc2Status={bloc2Status}
        logoDataUri={logoDataUri}
        date={date}
      />
      <Page3Referentiel
        profession={profession}
        diplomaYear={diplomaYear}
        logoDataUri={logoDataUri}
        date={date}
      />
      <Page4Formations
        profession={profession}
        logoDataUri={logoDataUri}
        date={date}
      />
      <Page5WhyNow logoDataUri={logoDataUri} date={date} />
      <Page6About
        profession={profession}
        logoDataUri={logoDataUri}
        date={date}
      />
    </Document>
  );
}
