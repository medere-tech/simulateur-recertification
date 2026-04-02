import * as fs from 'fs';
import * as path from 'path';
import type { Formation } from '@/lib/airtable';

// ─── Types ───────────────────────────────────────────────────────────
export interface ReportData {
  profession: string;
  diplomaYear: string;
  dpcFormations: string;
  email: string;
  score: number;
  urgency: 'rouge' | 'orange' | 'vert';
  bloc1Status: string;
  bloc2Status: string;
  bloc3Status: string;
  bloc4Status: string;
  formations: Formation[];
}

// ─── Profession Config ───────────────────────────────────────────────
const PROFESSIONS: Record<string, {
  label: string;
  color: string;
  accentColor: string;
  terminology: string;
  terminologyPlural: string;
  dimensions: { name: string }[];
  constraint: string | null;
  annexe: string;
  cycleDuration: number;
}> = {
  MG: {
    label: 'Médecin généraliste',
    color: '#006E90',
    accentColor: '#17BEBB',
    terminology: 'Bloc',
    terminologyPlural: 'Blocs',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du médecin' },
    ],
    constraint: 'Les actions en lien avec les pratiques suivantes ne peuvent pas être prises en compte dans la démarche de certification en médecine générale\u00a0: acupuncture, aromathérapie, art-thérapie, auriculothérapie, biologie totale, chiropraxie, décodage biologique, fleurs de Bach, homéopathie, iridologie, jeûne à visée préventive ou thérapeutique, magnétisme, médecine anti-âge, médecine esthétique, mésothérapie, moxibustion, musicothérapie, naturopathie, ostéopathie, phytothérapie, réflexologie, sylvothérapie, zoothérapie.',
    annexe: 'Annexe 1',
    cycleDuration: 9,
  },
  CD: {
    label: 'Chirurgien-dentiste',
    color: '#FECA45',
    accentColor: '#006E90',
    terminology: 'Axe',
    terminologyPlural: 'Axes',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du praticien' },
    ],
    constraint: 'Toutes les formations doivent avoir une durée minimale de 6 heures.',
    annexe: 'Annexe 3',
    cycleDuration: 9,
  },
  GO: {
    label: 'Gynécologue-obstétricien',
    color: '#D87DA9',
    accentColor: '#9F84BD',
    terminology: 'Bloc',
    terminologyPlural: 'Blocs',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du médecin' },
    ],
    constraint: "L'accréditation HAS via GYNERISQ couvre les Blocs 1, 2 et 3.",
    annexe: 'Annexe 2, spécialité n°16',
    cycleDuration: 6,
  },
  PED: {
    label: 'Pédiatre',
    color: '#17BEBB',
    accentColor: '#006E90',
    terminology: 'Bloc',
    terminologyPlural: 'Blocs',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du médecin' },
    ],
    constraint: 'En pédiatrie, 2 actions DPC comptent pour 1 action de certification (agrégation 2:1).',
    annexe: 'Annexe 2, spécialité n°35',
    cycleDuration: 6,
  },
  PSY: {
    label: 'Psychiatre',
    color: '#9F84BD',
    accentColor: '#D87DA9',
    terminology: 'Axe',
    terminologyPlural: 'Axes',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du médecin' },
    ],
    constraint: 'Le e-learning Qualiopi est explicitement validant pour l\'Axe 1.',
    annexe: 'Annexe 2, spécialité n°37',
    cycleDuration: 6,
  },
  AUTRE: {
    label: 'Autre médecin spécialiste',
    color: '#2DA131',
    accentColor: '#17BEBB',
    terminology: 'Bloc',
    terminologyPlural: 'Blocs',
    dimensions: [
      { name: 'Connaissances et compétences' },
      { name: 'Qualité des pratiques' },
      { name: 'Relation avec les patients' },
      { name: 'Santé personnelle du médecin' },
    ],
    constraint: null,
    annexe: 'Annexe 2',
    cycleDuration: 6,
  },
};

// ─── Urgency Config ──────────────────────────────────────────────────
const URGENCY_CONFIG: Record<string, { label: string; color: string; bgLight: string }> = {
  rouge: { label: 'Situation critique', color: '#CC0000', bgLight: '#FFF0F0' },
  orange: { label: 'En cours - à compléter', color: '#EA6C00', bgLight: '#FFF5EB' },
  vert: { label: 'Bien avancé', color: '#2DA131', bgLight: '#F0FFF0' },
};

// ─── Asset Loading ────────────────────────────────────────────────────
let _fontCache: Record<string, string> = {};
let _logoCache: string = '';
let _templateCache: Record<string, string> = {};

function getFontBase64(filename: string): string {
  if (_fontCache[filename]) return _fontCache[filename];
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', filename);
    _fontCache[filename] = fs.readFileSync(fontPath).toString('base64');
    return _fontCache[filename];
  } catch {
    return '';
  }
}

function cleanSvgTemplate(svg: string): string {
  // Supprimer les groupes avec filtre (texte avec ombre portée)
  svg = svg.replace(/<g filter="url\(#[^"]*\)"[^>]*>[\s\S]*?<\/g>/g, '');
  // Supprimer tous les éléments <text>
  svg = svg.replace(/<text[^>]*>[\s\S]*?<\/text>/g, '');
  // Supprimer les <tspan> orphelins
  svg = svg.replace(/<tspan[^>]*>[\s\S]*?<\/tspan>/g, '');
  return svg;
}

function getTemplateSrc(filename: string): string {
  if (_templateCache[filename]) return _templateCache[filename];
  try {
    const svgPath = path.join(process.cwd(), 'templates', filename);
    const raw = fs.readFileSync(svgPath, 'utf-8');
    const cleaned = cleanSvgTemplate(raw);
    _templateCache[filename] = 'data:image/svg+xml;base64,' + Buffer.from(cleaned).toString('base64');
    return _templateCache[filename];
  } catch {
    return '';
  }
}

function getSvgContent(filename: string): string {
  try {
    const svgPath = path.join(process.cwd(), 'public', 'images', 'pictos', filename);
    let svg = fs.readFileSync(svgPath, 'utf-8');
    svg = svg.replace(/width="56"/, 'width="48"').replace(/height="56"/, 'height="48"');
    return svg;
  } catch { return ''; }
}

function getLogoBase64(): string {
  if (_logoCache) return _logoCache;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-medere-black.png');
    console.log('[PDF] Logo path:', logoPath, 'exists:', fs.existsSync(logoPath));
    _logoCache = fs.readFileSync(logoPath).toString('base64');
    return _logoCache;
  } catch (e) {
    console.error('[PDF] Logo load error:', e);
    return '';
  }
}

// ─── CNP par profession ───────────────────────────────────────────────
const CNP_NAMES: Record<string, string> = {
  MG:    'Collège de la Médecine Générale (CMG)',
  CD:    'CNP des chirurgiens-dentistes',
  GO:    'CNP de gynécologie-obstétrique',
  PED:   'CNP de pédiatrie',
  PSY:   'CNP de psychiatrie',
  AUTRE: 'votre Conseil National Professionnel (CNP)',
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getDeadlineYear(data: ReportData): number {
  // MG et CD diplômés AVANT 2023 → cycle 9 ans → 2032
  // Toutes les autres combinaisons → 2028
  if ((data.profession === 'MG' || data.profession === 'CD') && data.diplomaYear !== 'apres_2023') {
    return 2032;
  }
  return 2028;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'valide': return 'Validé';
    case 'en_cours': return 'En cours';
    case 'a_faire': return 'À faire';
    default: return 'À faire';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'valide': return '#2DA131';
    case 'en_cours': return '#EA6C00';
    case 'a_faire': return '#CC0000';
    default: return '#CC0000';
  }
}

function getScore(status: string): string {
  if (status === 'valide')   return '2/2';
  if (status === 'en_cours') return '1/2';
  return '0/2';
}

function getMonthYear(): string {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}


// ─── Main Template Function ──────────────────────────────────────────
export function getReportHTML(data: ReportData): string {
  const prof = PROFESSIONS[data.profession] || PROFESSIONS.MG;
  const urg = URGENCY_CONFIG[data.urgency] || URGENCY_CONFIG.rouge;
  const monthYear = getMonthYear();
  const deadline = getDeadlineYear(data);

  // Fonts
  const fontLight = getFontBase64('Aileron-Light.ttf');
  const fontRegular = getFontBase64('Aileron-Regular.ttf');
  const fontSemiBold = getFontBase64('Aileron-SemiBold.ttf');
  const fontBold = getFontBase64('Aileron-Bold.ttf');
  const logo = getLogoBase64();

  // Template SVG backgrounds
  const svgCover     = getTemplateSrc('page-garde-rapport.svg');
  const svgPageH2    = getTemplateSrc('page-avec-H2.svg');
  const svgPageNormal = getTemplateSrc('page-normal-rapport.svg');
  const svgTableau   = getTemplateSrc('tableau-rapport.svg');
  const svgBanniere  = getTemplateSrc('banniere-cta-vers-catalogue-rapport.svg');

  // Bloc statuses
  const blocs = [
    { num: 1, name: prof.dimensions[0].name, status: getStatusLabel(data.bloc1Status), statusColor: getStatusColor(data.bloc1Status), score: getScore(data.bloc1Status), covered: true,  note: null },
    { num: 2, name: prof.dimensions[1].name, status: getStatusLabel(data.bloc2Status), statusColor: getStatusColor(data.bloc2Status), score: getScore(data.bloc2Status), covered: true,  note: null },
    { num: 3, name: prof.dimensions[2].name, status: getStatusLabel(data.bloc3Status), statusColor: getStatusColor(data.bloc3Status), score: getScore(data.bloc3Status), covered: true,  note: data.bloc3Status === 'a_faire' ? '1 formation disponible' : null },
    { num: 4, name: prof.dimensions[3].name, status: getStatusLabel(data.bloc4Status), statusColor: getStatusColor(data.bloc4Status), score: getScore(data.bloc4Status), covered: false, note: null },
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @font-face { font-family:'Aileron'; font-weight:300; src:url(data:font/truetype;base64,${fontLight}) format('truetype'); }
  @font-face { font-family:'Aileron'; font-weight:400; src:url(data:font/truetype;base64,${fontRegular}) format('truetype'); }
  @font-face { font-family:'Aileron'; font-weight:600; src:url(data:font/truetype;base64,${fontSemiBold}) format('truetype'); }
  @font-face { font-family:'Aileron'; font-weight:700; src:url(data:font/truetype;base64,${fontBold}) format('truetype'); }

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  @page { size:A4; margin:0; }

  body {
    font-family:'Aileron', 'Helvetica Neue', Arial, sans-serif;
    color:#302D2D;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }

  /* ── Page ── */
  .page {
    width:210mm;
    height:297mm;
    position:relative;
    overflow:hidden;
    background:#F9F5F2;
    page-break-after:always;
  }
  .page:last-child { page-break-after:auto; }

  .page-bg {
    position:absolute;
    top:0; left:0;
    width:100%; height:100%;
    object-fit:cover;
    z-index:0;
  }

  .page-inner {
    position:relative;
    z-index:1;
    padding:36px 48px 60px 48px;
    height:100%;
    display:flex;
    flex-direction:column;
  }

  /* ── Header ── */
  .page-header {
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding-bottom:12px;
    border-bottom:1px solid rgba(219,214,205,0.6);
    margin-bottom:28px;
    flex-shrink:0;
  }
  .page-header img { height:22px; width:auto; }
  .page-header .page-num { font-size:9px; font-weight:300; color:#9C9494; }

  /* ── Footer ── */
  .page-footer {
    position:absolute;
    bottom:24px;
    left:48px;
    right:48px;
    border-top:0.5px solid rgba(219,214,205,0.6);
    padding-top:8px;
    text-align:center;
    font-size:7px;
    font-weight:300;
    color:#9C9494;
    z-index:1;
  }

  /* ── Typography ── */
  h1 { font-size:26px; font-weight:700; color:#302D2D; line-height:1.2; margin-bottom:8px; }
  h2 { font-size:18px; font-weight:700; color:#302D2D; line-height:1.3; margin-bottom:16px; }
  h3 { font-size:13px; font-weight:600; color:#494343; margin-bottom:6px; }
  p, .body-text { font-size:10.5px; font-weight:400; color:#554F4F; line-height:1.6; }

  /* ── Info Box - CSS pur ── */
  .info-box {
    width:100%;
    margin:12px 0;
    border-radius:12px;
    padding:16px 20px;
  }
  .info-box.urgence {
    background:#FDF8F3;
    border:1.5px solid #DBD6CD;
  }
  .info-box.urgence::before {
    content:'BON À SAVOIR';
    display:block;
    font-size:8px;
    font-weight:700;
    letter-spacing:1.5px;
    color:#9C9494;
    background:#ffffff;
    padding:5px;
    text-transform:uppercase;
    margin-bottom:8px;
  }
  .info-box.urgence h3 { font-size:11.5px; color:#302D2D; margin-bottom:6px; }
  .info-box.urgence p { font-size:10px; color:#686162; }
  .info-box.resume {
    background:#006E90;
  }
  .info-box.resume h3 { color:#FFFFFF; font-size:11.5px; margin-bottom:6px; }
  .info-box.resume p { color:rgb(255, 255, 255); font-size:10px; }

  /* ── Table with SVG background ── */
  .table-wrapper {
    position:relative;
    margin:16px 0;
    border-radius:16px;
    overflow:hidden;
  }
  .table-bg {
    position:absolute;
    top:0; left:0;
    width:100%; height:100%;
    object-fit:fill;
    z-index:0;
  }
  .data-table {
    position:relative;
    z-index:1;
    width:100%;
    border-collapse:separate;
    border-spacing:0;
    background:transparent;
  }
  .data-table thead th {
    background:rgba(240,234,229,0.85);
    font-size:9px;
    font-weight:600;
    color:#494343;
    text-transform:uppercase;
    letter-spacing:0.5px;
    padding:10px 16px;
    text-align:left;
    border-bottom:1px solid rgba(219,214,205,0.8);
  }
  .data-table thead th:last-child { text-align:right; }
  .data-table tbody td {
    padding:14px 16px;
    font-size:10.5px;
    vertical-align:middle;
    border-bottom:1px solid rgba(240,234,229,0.9);
    background:rgba(255,255,255,0.6);
  }
  .data-table tbody tr:last-child td { border-bottom:none; }
  .data-table tbody td:last-child { text-align:right; font-weight:700; }
  .data-table .bloc-label { font-size:8.5px; font-weight:400; color:#9C9494; display:block; }
  .data-table .bloc-name { font-size:11px; font-weight:600; color:#302D2D; }

  /* ── Bullet list ── */
  .bullet-list { list-style:none; padding:0; margin:16px 0; }
  .bullet-list li {
    display:flex;
    align-items:flex-start;
    gap:12px;
    padding:8px 0;
    font-size:10.5px;
    color:#554F4F;
    line-height:1.5;
  }
  .bullet-dot {
    width:8px;
    height:8px;
    border-radius:50%;
    flex-shrink:0;
    margin-top:4px;
  }

  /* ── Badge pill ── */
  .badge {
    display:inline-block;
    padding:8px 28px;
    border-radius:999px;
    font-size:13px;
    font-weight:600;
    color:#FFFFFF;
  }

  /* ── CTA Block - CSS pur ── */
  .cta-block {
    border-radius:12px;
    padding:28px 32px;
    margin:24px 0;
    color:#FFFFFF;
  }
  .cta-block h3 { color:#FFFFFF; font-size:16px; font-weight:600; margin-bottom:16px; }
  .cta-row { display:flex; align-items:center; gap:10px; margin:8px 0; }
  .cta-label { font-size:9px; font-weight:400; opacity:0.7; min-width:40px; color:#FFFFFF; }
  .cta-value { font-size:12px; font-weight:600; color:#FFFFFF; }

  /* ── Check list ── */
  .check-item { display:flex; align-items:flex-start; gap:10px; margin:10px 0; }
  .check-icon { width:18px; height:18px; flex-shrink:0; margin-top:1px; }
  .check-text { font-size:10.5px; color:#554F4F; line-height:1.5; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 1 - COUVERTURE                                              -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgCover}" class="page-bg" alt="" />
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:60px 48px;">

    <div style="flex:1;"></div>

    <!-- Logo -->
    <img src="data:image/png;base64,${logo}"
         style="width:200px;height:auto;margin-bottom:28px;"
         alt="Médéré"/>

    <!-- Titre -->
    <h1 style="font-size:38px;text-align:center;margin-bottom:4px;">Votre diagnostic</h1>
    <h1 style="font-size:38px;text-align:center;margin-bottom:16px;">certification périodique</h1>

    <!-- Profession -->
    <p style="font-size:17px;font-weight:600;color:${prof.color};text-align:center;margin-bottom:6px;">
      ${prof.label}
    </p>

    <!-- Date -->
    <p style="font-size:11px;font-weight:300;color:#9C9494;text-align:center;margin-bottom:32px;">
      ${monthYear}
    </p>

    <!-- Badge DPC -->
    <div style="background:rgba(255,255,255,0.82);border-radius:999px;padding:10px 28px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
      <p style="font-size:11px;font-weight:600;color:#494343;text-align:center;">
        Organisme certifié DPC n°9262 &bull; Qualiopi
      </p>
    </div>

    <div style="flex:1;"></div>

    <!-- Confidentiel -->
    <p style="font-size:9px;font-weight:300;color:#9C9494;text-align:center;margin-bottom:40px;">
      Document personnalisé - Confidentiel
    </p>
  </div>

  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 2 - VOTRE DIAGNOSTIC                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgPageH2}" class="page-bg" alt="" />
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('heartrate.svg')}</div>
        <span class="page-num">Page 2 / 6</span>
      </div>
    </div>

    <h2>Votre diagnostic</h2>

    <!-- Score -->
    <div style="text-align:center;margin:20px 0 8px;">
      <span style="font-size:64px;font-weight:700;color:${urg.color};line-height:1;">
        ${data.score}/${8}
      </span>
    </div>
    <p style="text-align:center;font-size:11px;color:#807778;margin-bottom:16px;">
      actions validées sur 8 requises
    </p>

    <!-- Urgency badge -->
    <div style="text-align:center;margin-bottom:16px;">
      <span class="badge" style="background:${urg.color};">${urg.label}</span>
    </div>

    <!-- Deadline -->
    <p style="text-align:center;font-size:11px;color:#686162;margin-bottom:24px;">
      Vous avez jusqu'en <strong>${deadline}</strong> pour compléter vos 8 actions
    </p>

    <!-- Bloc table - tableau-rapport.svg background -->
    <div class="table-wrapper">
      <img src="${svgTableau}" class="table-bg" alt="" />
      <table class="data-table">
        <thead>
          <tr>
            <th>${prof.terminology}</th>
            <th>Statut</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${blocs.map(b => `
          <tr>
            <td>
              <span class="bloc-label">${prof.terminology} ${b.num}</span>
              <span class="bloc-name">${b.name}</span>
            </td>
            <td style="color:${b.statusColor};font-weight:600;font-size:11px;">
              ${b.status}${b.status === 'Validé' ? ' ✓' : ''}
              ${b.note ? `<br/><span style="font-size:9px;color:#2DA131;font-weight:400;">● ${b.note}</span>` : ''}
            </td>
            <td style="color:${b.statusColor};font-size:14px;">
              ${b.score}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Note blocs 3&4 -->
    <div class="info-box urgence">
      <p>
        Les ${prof.terminologyPlural} 3 &amp; 4 sont entièrement nouveaux dans ce cycle.
        Tous les praticiens partent de zéro pour ces 4 actions.
        Médéré ne propose pas encore de formations pour ces ${prof.terminologyPlural.toLowerCase()} sauf pour la formation sur l'agressivité (${prof.terminologyPlural.toLowerCase()}).
      </p>
    </div>
  </div>
  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 3 - CE QUE LE RÉFÉRENTIEL EXIGE                             -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgPageH2}" class="page-bg" alt="" />
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('book.svg')}</div>
        <span class="page-num">Page 3 / 6</span>
      </div>
    </div>

    <h2 style="line-height:1.3;">
      Ce que le référentiel exige<br/>
      pour les ${prof.label}s
    </h2>

    <p style="margin-bottom:20px;">
      L'arrêté du 26 février 2026 (NOR&nbsp;: SFHH2605575A) définit 8 actions obligatoires
      réparties sur 4 ${prof.terminologyPlural.toLowerCase()}. Chaque ${prof.terminology.toLowerCase()}
      requiert au minimum 2 actions validées sur votre cycle de ${prof.cycleDuration} ans.
    </p>

    ${prof.constraint ? `
    <!-- Contrainte spécifique -->
    <div class="info-box resume">
      <h3>Contrainte spécifique à votre profession</h3>
      <p>${prof.constraint}</p>
    </div>
    ` : ''}

    <!-- Blocs 3 & 4 nouveaux -->
    <div class="info-box urgence">
      <h3>${prof.terminologyPlural} 3 et 4 - 100&nbsp;% nouveaux</h3>
      <p>
        Les ${prof.terminologyPlural} 3 et 4 sont entièrement nouveaux.
        Aucune formation DPC antérieure à 2023 ne les couvre.
        100&nbsp;% des praticiens partent de zéro.
      </p>
    </div>

    <p style="font-size:10.5px;color:#686162;margin:20px 0 8px;">
      Détail des 4 ${prof.terminologyPlural.toLowerCase()} pour les ${prof.label}s :
    </p>

    <!-- Table détail - tableau-rapport.svg -->
    <div class="table-wrapper">
      <img src="${svgTableau}" class="table-bg" alt="" />
      <table class="data-table">
        <tbody>
          ${blocs.map(b => `
          <tr>
            <td>
              <span class="bloc-label">${prof.terminology} ${b.num}</span>
              <span class="bloc-name">${b.name}</span>
            </td>
            <td style="color:${b.covered ? '#2DA131' : '#9C9494'};font-weight:${b.covered ? '600' : '400'};font-size:10.5px;">
              ${b.covered
                ? (b.note ? `Couvert par Médéré (${b.note})` : 'Couvert par Médéré')
                : 'Hors catalogue'}
            </td>
            <td style="font-size:10px;color:#686162;">
              2 actions min.
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <p style="font-size:8.5px;font-weight:300;color:#9C9494;margin-top:12px;">
      Référence : Arrêté du 26 février 2026 - NOR&nbsp;: SFHH2605575A - ${prof.annexe}
    </p>
  </div>
  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 4 - FORMATIONS MÉDÉRÉ                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgPageH2}" class="page-bg" alt="" />
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('computer.svg')}</div>
        <span class="page-num">Page 4 / 6</span>
      </div>
    </div>

    <h2>
      Formations Médéré éligibles<br/>
      à votre certification
    </h2>

    <!-- Mention ANDPC globale -->
    <div class="info-box urgence" style="margin-bottom:20px;">
      <h3>Prise en charge ANDPC</h3>
      <p>
        Nos formations sont éligibles à votre certification périodique et sont financées par l'ANDPC,
        sans avance de frais de votre part.
        Toutes nos formations validées par l'ANDPC sont reconnues pour votre certification périodique.
        Certaines formations hors DPC doivent être validées par votre ${CNP_NAMES[data.profession] || CNP_NAMES.AUTRE}
        pour pouvoir faire partie de votre certification périodique.
        Votre Ordre valide définitivement votre certification en fin de période\u00a0:
        en ${deadline} dans votre cas.
      </p>
    </div>

    ${(() => {
      const bloc1Fms = data.formations.filter(f => f.blocAxe === '1');
      const bloc2Fms = data.formations.filter(f => f.blocAxe === '2');

      const bloc1Needed = data.bloc1Status !== 'valide';
      const bloc2Needed = data.bloc2Status !== 'valide';

      function formationCard(f: Formation): string {
        const dureeLabel = f.duree ? `${f.duree}` : '';
        const link = f.url
          ? `<a href="${f.url}" style="font-size:10px;color:#006E90;text-decoration:underline;">En savoir plus sur medere.fr</a>`
          : '';
        return `
          <div style="border-left:3px solid ${prof.color};padding:8px 10px;margin-bottom:10px;background:#FAFAFA;border-radius:0 6px 6px 0;">
            <p style="font-size:11px;font-weight:700;color:#302D2D;margin:0 0 3px;">${f.titre}</p>
            <p style="font-size:10px;color:#686162;margin:0 0 4px;">${[f.format, dureeLabel].filter(Boolean).join(' · ')}</p>
            ${link}
          </div>`;
      }

      let html = '';

      if (!bloc1Needed && !bloc2Needed) {
        html += `
          <div style="background:#F0FBF0;border:1px solid #2DA131;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
            <p style="font-size:11px;font-weight:600;color:#1A6E1E;margin:0;">
              Félicitations, vos ${prof.terminologyPlural} 1 et 2 sont validés !
              Consultez notre catalogue pour maintenir vos compétences.
            </p>
          </div>`;
      } else {
        if (bloc1Needed && bloc1Fms.length > 0) {
          html += `
            <p style="font-size:11px;font-weight:700;color:#302D2D;margin:0 0 8px;">
              ${prof.terminology} 1 - ${prof.dimensions[0].name}
            </p>`;
          html += bloc1Fms.map(formationCard).join('');
        }

        if (bloc2Needed && bloc2Fms.length > 0) {
          html += `
            <p style="font-size:11px;font-weight:700;color:#302D2D;margin:${bloc1Needed && bloc1Fms.length ? '12px' : '0'} 0 8px;">
              ${prof.terminology} 2 - ${prof.dimensions[1].name}
            </p>`;
          html += bloc2Fms.map(formationCard).join('');
        }

        if ((bloc1Needed && bloc1Fms.length === 0) || (bloc2Needed && bloc2Fms.length === 0)) {
          html += `
            <div class="info-box resume" style="margin-top:12px;">
              <p>
                Les formations pour votre profil (${prof.label}) seront disponibles prochainement.
                Contactez-nous au <strong style="color:#FFFFFF;">01&nbsp;88&nbsp;33&nbsp;95&nbsp;28</strong>
                ou sur <strong style="color:#FFFFFF;">medere.fr</strong>.
              </p>
            </div>`;
        }
      }

      if (data.bloc3Status === 'a_faire') {
        html += `
          <p style="font-size:11px;font-weight:700;color:#302D2D;margin:12px 0 8px;">
            ${prof.terminology} 3 - ${prof.dimensions[2].name}
          </p>
          <div style="border-left:3px solid ${prof.color};padding:8px 10px;margin-bottom:10px;background:#FAFAFA;border-radius:0 6px 6px 0;">
            <p style="font-size:11px;font-weight:700;color:#302D2D;margin:0 0 3px;">Gestion de l'agressivité</p>
            <p style="font-size:10px;color:#686162;margin:0 0 4px;">E-Learning</p>
            <a href="https://www.medere.fr/formations" style="font-size:10px;color:#006E90;text-decoration:underline;">En savoir plus sur medere.fr</a>
          </div>`;
      }

      return html;
    })()}

    <!-- CTA catalogue -->
    <p style="font-size:10.5px;color:#686162;margin-top:16px;text-align:center;">
      Découvrez l'ensemble de nos formations sur
      <a href="https://medere.fr/formations" style="color:#006E90;text-decoration:underline;">medere.fr/formations</a>
    </p>
  </div>
  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 5 - POURQUOI AGIR EN 2026                                    -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgPageH2}" class="page-bg" alt="" />
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('calendar.svg')}</div>
        <span class="page-num">Page 5 / 6</span>
      </div>
    </div>

    <h2>Pourquoi agir en 2026</h2>

    <p style="margin-bottom:16px;">
      La certification périodique n'est pas une recommandation, c'est une obligation légale.
      Voici pourquoi ne pas attendre :
    </p>

    <ul class="bullet-list">
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>L'obligation est en vigueur depuis le 1er janvier 2023</span>
      </li>
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>2026 est probablement la dernière année de financement ANDPC</span>
      </li>
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>En 2025, les budgets ont été épuisés dès septembre</span>
      </li>
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>Formations indemnisées - vous êtes rémunéré pour le temps consacré</span>
      </li>
    </ul>

    <!-- Calendrier ANDPC -->
    <div class="info-box resume">
      <h3>Le calendrier ANDPC en pratique</h3>
      <p>
        L'ANDPC attribue les budgets en début d'année civile. Une fois les enveloppes épuisées,
        toute formation réalisée reste à votre charge. Les places dans les sessions éligibles sont
        limitées et s'épuisent rapidement - particulièrement pour les spécialités comme la pédiatrie
        et la psychiatrie.
      </p>
    </div>

    <!-- Rappel réglementaire -->
    <div class="info-box urgence">
      <p style="font-weight:600;font-size:10.5px;color:#cc0000;">
        Rappel réglementaire : en cas de non-respect de vos obligations de certification périodique,
        votre Ordre peut engager une procédure disciplinaire. Ce document vous aide à anticiper, agissez maintenant\u00a0!
      </p>
    </div>
  </div>
  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 6 - À PROPOS + CTA                                          -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <img src="${svgPageNormal}" class="page-bg" alt="" />
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('heart.svg')}</div>
        <span class="page-num">Page 6 / 6</span>
      </div>
    </div>

    <p style="font-size:11px;font-style:italic;color:#554F4F;line-height:1.6;margin-bottom:24px;">
      Médéré est le seul organisme de formation fondé et dirigé par un médecin,
      le Dr&nbsp;Harry Sitbon, qui ne propose que des formations conformes aux
      référentiels officiels de certification périodique.
    </p>

    <h3 style="font-size:14px;margin-bottom:16px;">Nos garanties réglementaires</h3>

    <!-- Check items -->
    <div class="check-item">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${prof.color}" opacity="0.12"/>
        <path d="M7 12.5L10.5 16L17 9" stroke="${prof.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="check-text">Comité scientifique identifié - fondateur médecin (Dr Harry Sitbon)</span>
    </div>
    <div class="check-item">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${prof.color}" opacity="0.12"/>
        <path d="M7 12.5L10.5 16L17 9" stroke="${prof.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="check-text">Déclarations publiques d'intérêts de tous les intervenants</span>
    </div>
    <div class="check-item">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${prof.color}" opacity="0.12"/>
        <path d="M7 12.5L10.5 16L17 9" stroke="${prof.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="check-text">Aucun lien financier avec l'industrie pharmaceutique</span>
    </div>
    <div class="check-item">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${prof.color}" opacity="0.12"/>
        <path d="M7 12.5L10.5 16L17 9" stroke="${prof.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="check-text">Méthodes HAS de référence - Qualiopi certifié</span>
    </div>

    <!-- Bannière CTA -->
    <a href="https://www.medere.fr/formations/medecin-generaliste" style="display:block;margin-top:24px;">
      <img src="${svgBanniere}" style="width:100%;height:auto;display:block;" alt="Voir le catalogue Médéré" />
    </a>

    <div style="flex:1;"></div>

    <!-- Legal -->
    <p style="font-size:7.5px;font-weight:300;color:#9C9494;text-align:center;line-height:1.5;">
      Basé sur l'arrêté du 26 février 2026 - NOR&nbsp;: SFHH2605575A.
      Ce document est une estimation indicative. La validation finale de votre certification
      est prononcée par votre Ordre professionnel.
    </p>
  </div>
  <div class="page-footer">Médéré - Document confidentiel - ${monthYear}</div>
</div>

</body>
</html>`;
}
