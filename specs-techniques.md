# Spécifications Techniques — Simulateur de Recertification Médéré
# Version 2.0 — Corrigée avec analyse_cibles + brief_commercial v4

## Stack technique
- **Framework** : Next.js 14+ (App Router) + TypeScript
- **Styling** : Tailwind CSS
- **Font** : Aileron (custom TTF, 16 graisses)
- **Hébergement** : Vercel
- **Domaine** : simulateurdpc.fr
- **Analytics** : GA4 — Propriété G-4QX8DR7DPS
- **CRM** : HubSpot API (injection directe contacts)
- **PDF** : @react-pdf/renderer (génération côté serveur)
- **Email** : Vercel serverless + HubSpot transactional email (envoi du PDF)

## Architecture
```
/app
  page.tsx                    → Écran 1 (accroche)
  /simulateur/page.tsx        → Écrans 2-5 (questions, state machine)
  /resultat/page.tsx          → Écran 6 (résultat gratuit)
  /plan-action/page.tsx       → Écrans 7-8 (capture email + confirmation)
  /api/lead/route.ts          → Serverless: créer contact HubSpot
  /api/report/route.ts        → Serverless: générer PDF personnalisé + envoi email
/components
  ProgressBar.tsx
  QuestionCard.tsx
  ScoreGauge.tsx              → Jauge rouge/orange/vert
  BlocStatus.tsx              → Indicateur par bloc/axe (dynamique)
  TrustBadge.tsx              → Logo Médéré + DPC + Qualiopi
  LeadForm.tsx                → Email + tel optionnel + RGPD
/lib
  scoring.ts                  → Logique calcul par profession
  professions.ts              → Config par profession (terminologie, couleurs, limites)
  ga4.ts                      → Helper events GA4
  hubspot.ts                  → Client API HubSpot
/lib/pdf
  ReportTemplate.tsx          → Template React-PDF du rapport personnalisé
  generate.ts                 → Génération du buffer PDF
/public
  /fonts (Aileron Regular, SemiBold, Bold, Light)
  /images (logos Médéré wordmark noir/blanc, icône, badges DPC/Qualiopi)
```

---

## 5 PROFESSIONS CIBLES (pas d'IDE)

```typescript
// lib/professions.ts
export const PROFESSIONS = {
  MG: {
    label: "Médecin généraliste",
    shortLabel: "MG",
    color: "#006E90",
    dimensionLabel: "Bloc",     // MG utilise "Blocs"
    annexe: "Annexe 1",
    cycle: "6 ans (9 ans si diplômé avant 01/01/2023)",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CMG — Collège de la Médecine Générale",
    constraints: {
      durationMin: null,        // Pas de durée minimum explicite
      excludedPractices: true,  // 18 pratiques exclues (homéo, ostéo...)
      dpcAutoValid: true,       // DPC ANDPC = labellisation de fait ✪
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle du médecin", medereCovers: false },
    ],
  },
  CD: {
    label: "Chirurgien-dentiste",
    shortLabel: "CD",
    color: "#FECA45",
    textOnColor: "#302D2D",     // Texte sombre sur fond jaune
    dimensionLabel: "Axe",      // CD utilise "Axes"
    annexe: "Annexe 3",
    cycle: "6 ans (9 ans si diplômé avant 01/01/2023)",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP Chirurgiens-dentistes / Ordre national",
    constraints: {
      durationMin: "6h",        // TOUTES formations ≥ 6h obligatoire
      excludedPractices: false,
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  GO: {
    label: "Gynécologue-Obstétricien",
    shortLabel: "GO-GM",
    color: "#D87DA9",
    dimensionLabel: "Bloc",
    annexe: "Annexe 2, spécialité n°16",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP GO-GM — accréditation via GYNERISQ",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  PED: {
    label: "Pédiatre",
    shortLabel: "PED",
    color: "#17BEBB",
    dimensionLabel: "Bloc",
    annexe: "Annexe 2, spécialité n°35",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP de Pédiatrie",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
      dpcAggregation: "2 DPC = 1 action CP",  // Spécifique pédiatrie
      congressAggregation: "3 journées = 1 action",
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients et leurs représentants", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
  PSY: {
    label: "Psychiatre",
    shortLabel: "PSY",
    color: "#9F84BD",
    dimensionLabel: "Axe",      // PSY utilise "Axes"
    annexe: "Annexe 2, spécialité n°37",
    cycle: "6 ans",
    actionsMin: 8,
    actionsParDimension: 2,
    cnp: "CNP de Psychiatrie (CNPP)",
    constraints: {
      durationMin: null,
      excludedPractices: false,
      dpcAutoValid: true,
      elearningValid: true,     // E-learning Qualiopi explicitement validant Axe 1
    },
    dimensions: [
      { id: 1, name: "Connaissances et compétences", medereCovers: true },
      { id: 2, name: "Qualité des pratiques", medereCovers: true },
      { id: 3, name: "Relation avec les patients", medereCovers: false },
      { id: 4, name: "Santé personnelle", medereCovers: false },
    ],
  },
};
```

---

## CHARTE GRAPHIQUE MÉDÉRÉ (officielle)

### Typographie : Aileron
- Titres : Bold / SemiBold
- Corps : Regular
- Micro-copy : Light
- Fallback : system-ui, -apple-system, sans-serif

### Couleurs Tailwind
```typescript
colors: {
  neutral: {
    0: '#FFFFFF', 10: '#F9F5F2', 20: '#F0EAE5', 30: '#DBD6CD',
    40: '#9C9494', 50: '#807778', 60: '#686162', 70: '#554F4F',
    80: '#494343', 90: '#3F3B3C', 100: '#302D2D',
  },
  specialist: {
    general: '#006E90', dentist: '#FECA45', psychiatrist: '#9F84BD',
    pediatrician: '#17BEBB', gynecologist: '#D87DA9',
    radiologist: '#F19953', others: '#2DA131',
  },
  primary: '#006E90',
  success: '#2DA131',
  warning: '#FECA45',
  danger: '#CC0000',
}
```

### Logo
- Wordmark "médéré" : header (noir sur fond clair, blanc sur fond sombre)
- Icône double barre : favicon

### Design dynamique par profession
Après l'écran 2, la couleur d'accent s'adapte à la profession choisie.

---

## SCORING PAR PROFESSION

```typescript
// lib/scoring.ts

// RÈGLE FONDAMENTALE : Blocs/Axes 3 & 4 = 0 pour TOUT LE MONDE
// Les formations DPC antérieures à 2023 ne couvrent PAS les Blocs 3 & 4
// Médéré ne propose PAS encore de formations Blocs 3 & 4

function calculateScore(profession, diplomaYear, dpcFormations) {
  // Échéance
  const echeance = diplomaYear === "avant_2023" ? 2032 : diplomaYearValue + 6;

  // Blocs 3 & 4 = TOUJOURS 0
  const bloc3 = 0;
  const bloc4 = 0;

  // Blocs 1 & 2 = basé sur formations DPC déclarées
  let bloc1, bloc2;

  if (profession === "PED") {
    // Pédiatrie : 2 DPC = 1 action certification
    const rawActions = DPC_TO_ACTIONS[dpcFormations];
    const adjustedActions = Math.floor(rawActions / 2);
    bloc1 = Math.min(adjustedActions, 2);
    bloc2 = Math.max(adjustedActions - 2, 0);
  } else {
    // Autres professions
    const actions = DPC_TO_ACTIONS[dpcFormations];
    bloc1 = Math.min(actions, 2);
    bloc2 = Math.max(Math.min(actions - 2, 2), 0);
  }

  const totalScore = bloc1 + bloc2 + bloc3 + bloc4;
  const maxScore = 8;
  const urgency = totalScore <= 2 ? "rouge" : totalScore <= 4 ? "orange" : "vert";

  return { bloc1, bloc2, bloc3, bloc4, totalScore, maxScore, echeance, urgency };
}

const DPC_TO_ACTIONS = {
  "3_plus": 4,
  "1_ou_2": 2,
  "aucune": 0,
  "ne_sait_pas": 1,
};
```

---

## PDF PERSONNALISÉ — Rapport d'action

### Technologie
- @react-pdf/renderer (génération serveur dans Vercel serverless)
- Aileron embarqué dans le PDF (via registerFont)
- Couleurs dynamiques selon profession

### Contenu du PDF (6 pages)
1. **Page de couverture** : Logo Médéré + "Votre diagnostic certification périodique" + Profession + Date
2. **Votre situation** : Jauge de score + échéance + les 4 blocs/axes avec statut
3. **Ce que dit le référentiel** : Résumé des obligations pour CETTE profession (extrait du doc Harry)
4. **Formations Médéré recommandées** (Blocs 1 & 2 UNIQUEMENT) : liste avec liens, durée, format, prochaines dates
5. **Prochaines étapes** : CTA prise de RDV + contact commercial + urgence ANDPC
6. **À propos de Médéré** : Pitch Harry + certifications DPC/Qualiopi + mentions légales

### Contraintes spécifiques dans le PDF
- CD : mention "Durée minimale obligatoire : 6h par formation"
- PED : mention "2 actions DPC = 1 action de certification"
- PSY : mention "E-learning Qualiopi validant pour l'Axe 1"
- MG : mention "18 pratiques exclues (homéopathie, ostéopathie...)"
- TOUS : "Nos formations sont éligibles à votre certification" (PAS "valident")
- TOUS : "Pris en charge sans avance de frais via l'ANDPC" (PAS "remboursé")

### Endpoint : POST /api/report
- Input : profession, diplomaYear, dpcFormations, awareness, email, phone?
- Process : calcul score → génération PDF → envoi email avec PDF attaché → création contact HubSpot
- Output : { success: true, score, urgency }

---

## Events GA4
| Event | Paramètres |
|-------|-----------|
| simulator_start | source |
| step_completed | step_number (1-4), step_value |
| result_viewed | score, profession, urgency_level, diploma_range |
| email_captured | profession, score, source |
| phone_captured | profession, score |
| rdv_clicked | profession, score |
| scroll_depth | percentage (25/50/75/100) |
| pdf_generated | profession, score |

## HubSpot — Propriétés custom
- certification_score (number, 0-8)
- certification_profession (enum: MG, CD, GO_GM, PED, PSY)
- certification_diploma_year (enum: avant_2000, 2000_2010, 2011_2022, apres_2023)
- certification_dpc_formations (enum: 3_plus, 1_ou_2, aucune, ne_sait_pas)
- certification_urgency (enum: rouge, orange, vert)
- certification_source (string: meta, google, organic, email)
- certification_date (date)
- certification_bloc1_status (enum: valide, en_cours, a_faire)
- certification_bloc2_status (enum: valide, en_cours, a_faire)
- certification_pdf_sent (boolean)

## Performance cibles
- Lighthouse : 95+
- LCP : < 2.5s, FID : < 100ms, CLS : < 0.1
- Font : Aileron avec font-display: swap + preload Regular et SemiBold
- PDF generation : < 3s côté serveur

## Sécurité
- Clé API HubSpot en env var Vercel (HUBSPOT_API_KEY)
- Rate limiting endpoints /api/* : 10 req/min/IP
- Validation email client + serveur
- Headers sécurité via vercel.json
- Pas de données de santé collectées (pas de données sensibles RGPD au sens strict)

## Vocabulaire imposé (brief commercial v4)
- ✅ "éligible à votre certification" — ❌ "valide votre certification"
- ✅ "pris en charge sans avance de frais" — ❌ "remboursé"
- ✅ "atteindre la conformité" — ❌ "être en règle"
- ✅ "classe virtuelle synchrone indemnisée 45€/h" — ❌ e-learning (plus indemnisé depuis jan 2026)
