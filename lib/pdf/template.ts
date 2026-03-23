import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────
export interface ReportData {
  profession: string;
  diplomaYear: string;
  dpcFormations: string;
  awareness: string;
  email: string;
  score: number;
  urgency: 'rouge' | 'orange' | 'vert';
  bloc1Status: string;
  bloc2Status: string;
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
    constraint: '18 pratiques sont exclues (homéopathie, ostéopathie, naturopathie, acupuncture…)',
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
  orange: { label: 'En cours — à compléter', color: '#EA6C00', bgLight: '#FFF5EB' },
  vert: { label: 'Bien avancé', color: '#2DA131', bgLight: '#F0FFF0' },
};

// ─── Font & Logo Loading ─────────────────────────────────────────────
let _fontCache: Record<string, string> = {};
let _logoCache: string = '';

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
  return status === 'valide' ? '2/2' : '0/2';
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

  // Bloc statuses
  const blocs = [
    { num: 1, name: prof.dimensions[0].name, status: getStatusLabel(data.bloc1Status), statusColor: getStatusColor(data.bloc1Status), score: getScore(data.bloc1Status), covered: true },
    { num: 2, name: prof.dimensions[1].name, status: getStatusLabel(data.bloc2Status), statusColor: getStatusColor(data.bloc2Status), score: getScore(data.bloc2Status), covered: true },
    { num: 3, name: prof.dimensions[2].name, status: 'Nouveau — À faire', statusColor: '#CC0000', score: '0/2', covered: false },
    { num: 4, name: prof.dimensions[3].name, status: 'Nouveau — À faire', statusColor: '#CC0000', score: '0/2', covered: false },
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

  .page {
    width:210mm; 
    height:297mm; 
    position:relative; 
    overflow:hidden;
    background:#F9F5F2;
    page-break-after:always;
  }
  .page:last-child { page-break-after:auto; }

  /* ── Page inner padding (not on cover) ── */
  .page-inner {
    padding: 36px 48px 60px 48px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .page-header {
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding-bottom:12px;
    border-bottom:1px solid #DBD6CD;
    margin-bottom:28px;
    flex-shrink: 0;
  }
  .page-header img { height:22px; width:auto; }
  .page-header .page-num { font-size:9px; font-weight:300; color:#9C9494; }

  /* ── Footer ── */
  .page-footer {
    position:absolute;
    bottom:24px;
    left:48px;
    right:48px;
    border-top:0.5px solid #DBD6CD;
    padding-top:8px;
    text-align:center;
    font-size:7px;
    font-weight:300;
    color:#9C9494;
  }

  /* ── Titles ── */
  h1 { font-size:26px; font-weight:700; color:#302D2D; line-height:1.2; margin-bottom:8px; }
  h2 { font-size:18px; font-weight:700; color:#302D2D; line-height:1.3; margin-bottom:16px; }
  h3 { font-size:13px; font-weight:600; color:#494343; margin-bottom:6px; }
  p, .body-text { font-size:10.5px; font-weight:400; color:#554F4F; line-height:1.6; }

  /* ── Info Box (left bar only, NO other borders) ── */
  .info-box {
    padding:14px 18px 14px 18px;
    margin:12px 0;
    border-left:1px solid #006E90;
    background:#F0EAE5;
  }
  .info-box h3 { margin-bottom:4px; font-size:11.5px; }
  .info-box p { font-size:10px; color:#686162; }
  .info-box.warning { border-left-color:#EA6C00; }
  .info-box.danger { border-left-color:#CC0000; background:#FBEAEA; }
  .info-box.success { border-left-color:#2DA131; }

  /* ── Tables ── */
  .data-table {
    width:100%;
    border-collapse:separate;
    border-spacing:0;
    border:1px solid #DBD6CD;
    border-radius:8px;
    overflow:hidden;
    margin:16px 0;
  }
  .data-table thead th {
    background:#F0EAE5;
    font-size:9px;
    font-weight:600;
    color:#494343;
    text-transform:uppercase;
    letter-spacing:0.5px;
    padding:10px 16px;
    text-align:left;
    border-bottom:1px solid #DBD6CD;
  }
  .data-table thead th:last-child { text-align:right; }
  .data-table tbody td {
    padding:14px 16px;
    font-size:10.5px;
    vertical-align:middle;
    border-bottom:1px solid #F0EAE5;
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

  /* ── CTA Block ── */
  .cta-block {
    border-radius:12px;
    padding:28px 32px;
    color:#FFFFFF;
    margin:24px 0;
  }
  .cta-block h3 { color:#FFFFFF; font-size:16px; font-weight:600; margin-bottom:16px; }
  .cta-row { display:flex; align-items:center; gap:10px; margin:8px 0; }
  .cta-label { font-size:9px; font-weight:400; opacity:0.7; min-width:40px; }
  .cta-value { font-size:12px; font-weight:600; }

  /* ── Check list ── */
  .check-item { display:flex; align-items:flex-start; gap:10px; margin:10px 0; }
  .check-icon { width:18px; height:18px; flex-shrink:0; margin-top:1px; }
  .check-text { font-size:10.5px; color:#554F4F; line-height:1.5; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 1 — COUVERTURE                                              -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:60px 48px;">
    
    <div style="flex:1;"></div>
    
    <!-- Logo -->
    <img src="data:image/png;base64,${logo}" 
         style="width:140px;height:auto;margin-bottom:28px;" 
         alt="Médéré"/>
    
    <!-- Titre -->
    <h1 style="font-size:32px;text-align:center;margin-bottom:4px;">Votre diagnostic</h1>
    <h1 style="font-size:32px;text-align:center;margin-bottom:16px;">certification périodique</h1>
    
    <!-- Profession -->
    <p style="font-size:17px;font-weight:600;color:${prof.color};text-align:center;margin-bottom:6px;">
      ${prof.label}
    </p>
    
    <!-- Date -->
    <p style="font-size:11px;font-weight:300;color:#9C9494;text-align:center;margin-bottom:32px;">
      ${monthYear}
    </p>
    
    <!-- Badge DPC -->
    <div style="background:#FFFFFF;border-radius:999px;padding:10px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <p style="font-size:11px;font-weight:600;color:#494343;text-align:center;">
        Organisme certifié DPC n°9262 &bull; Qualiopi
      </p>
    </div>
    
    <div style="flex:1;"></div>
    
    <!-- Confidentiel -->
    <p style="font-size:9px;font-weight:300;color:#9C9494;text-align:center;margin-bottom:40px;">
      Document personnalisé — Confidentiel
    </p>
  </div>
  
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 2 — VOTRE DIAGNOSTIC                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
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

    <!-- Bloc table -->
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
          </td>
          <td style="color:${b.statusColor};font-size:14px;">
            ${b.score}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Note blocs 3&4 -->
    <div class="info-box" style="border-left-color:${prof.color};margin-top:16px;">
      <p style="font-size:10px;color:#686162;">
        Les ${prof.terminologyPlural} 3 &amp; 4 sont entièrement nouveaux dans ce cycle. 
        Tous les praticiens partent de zéro pour ces 4 actions. 
        Médéré ne propose pas encore de formations pour ces ${prof.terminologyPlural.toLowerCase()}.
      </p>
    </div>
  </div>
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 3 — CE QUE LE RÉFÉRENTIEL EXIGE                             -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
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
    <div class="info-box warning">
      <h3>Contrainte spécifique à votre profession</h3>
      <p>${prof.constraint}</p>
    </div>
    ` : ''}

    <div class="info-box danger">
      <h3>${prof.terminologyPlural} 3 et 4 — 100&nbsp;% nouveaux</h3>
      <p>
        Les ${prof.terminologyPlural} 3 et 4 sont entièrement nouveaux. 
        Aucune formation DPC antérieure à 2023 ne les couvre. 
        100&nbsp;% des praticiens partent de zéro.
      </p>
    </div>

    <p style="font-size:10.5px;color:#686162;margin:20px 0 8px;">
      Détail des 4 ${prof.terminologyPlural.toLowerCase()} pour les ${prof.label}s :
    </p>

    <table class="data-table">
      <tbody>
        ${blocs.map(b => `
        <tr>
          <td>
            <span class="bloc-label">${prof.terminology} ${b.num}</span>
            <span class="bloc-name">${b.name}</span>
          </td>
          <td style="color:${b.covered ? '#2DA131' : '#9C9494'};font-weight:${b.covered ? '600' : '400'};font-size:10.5px;">
            ${b.covered ? 'Couvert par Médéré' : 'Hors catalogue'}
          </td>
          <td style="font-size:10px;color:#686162;">
            2 actions min.
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="font-size:8.5px;font-weight:300;color:#9C9494;margin-top:12px;">
      Référence : Arrêté du 26 février 2026 — NOR&nbsp;: SFHH2605575A — ${prof.annexe}
    </p>
  </div>
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 4 — FORMATIONS MÉDÉRÉ                                        -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
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

    <p style="font-size:12px;font-weight:400;color:#686162;margin-bottom:20px;">
      ${prof.terminologyPlural} 1 &amp; 2 — Pris en charge sans avance de frais via l'ANDPC
    </p>

    <!-- Catalogue placeholder -->
    <div class="info-box" style="border-left-color:${prof.color};">
      <h3>Catalogue en cours de mise à jour</h3>
      <p>
        Nos formations adaptées à votre profil (${prof.label}) seront disponibles prochainement. 
        Consultez notre catalogue sur <strong>medere.fr</strong> ou contactez-nous au 
        <strong>01&nbsp;88&nbsp;33&nbsp;95&nbsp;28</strong> pour connaître les sessions ouvertes.
      </p>
    </div>

    <p style="font-size:10.5px;color:#686162;margin:20px 0 8px;">
      Nos formations pour les ${prof.terminologyPlural.toLowerCase()} 1 &amp; 2 couvrent :
    </p>

    <ul class="bullet-list">
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>${prof.dimensions[0].name} — ${prof.terminology} 1</span>
      </li>
      <li>
        <span class="bullet-dot" style="background:${prof.color};"></span>
        <span>${prof.dimensions[1].name} — ${prof.terminology} 2</span>
      </li>
    </ul>

    <!-- ANDPC -->
    <div class="info-box success">
      <h3>Prise en charge ANDPC</h3>
      <p>
        Nos formations sont éligibles à votre certification périodique et financées par l'ANDPC — 
        sans avance de frais de votre part. Seuls le CNP et l'Ordre valident définitivement en fin de cycle.
      </p>
    </div>

    <!-- Blocs 3&4 -->
    <div class="info-box" style="border-left-color:${prof.color};">
      <h3>Pour les ${prof.terminologyPlural} 3 &amp; 4</h3>
      <p>
        Ces ${prof.terminologyPlural.toLowerCase()} étant entièrement nouveaux (aucune offre existante avant 2023), 
        Médéré développe actuellement des formations spécifiques. 
        Contactez-nous pour être informé en priorité.
      </p>
    </div>
  </div>
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 5 — POURQUOI AGIR EN 2026                                    -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
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
      La certification périodique n'est pas une recommandation — c'est une obligation légale. 
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
        <span>Pris en charge sans avance de frais — pas un centime à avancer</span>
      </li>
    </ul>

    <!-- Urgency callout -->
    <div class="info-box" style="border-left-color:${prof.color};background:${prof.color}0D;">
      <p style="font-weight:600;font-size:11.5px;color:#302D2D;">
        Chaque semaine qui passe = une place en moins + un risque de financement personnel en plus.
      </p>
    </div>

    <!-- ANDPC calendar -->
    <div class="info-box" style="border-left-color:${prof.color};">
      <h3>Le calendrier ANDPC en pratique</h3>
      <p>
        L'ANDPC attribue les budgets en début d'année civile. Une fois les enveloppes épuisées, 
        toute formation réalisée reste à votre charge. Les places dans les sessions éligibles sont 
        limitées et s'épuisent rapidement — particulièrement pour les spécialités comme la pédiatrie 
        et la psychiatrie.
      </p>
    </div>

    <!-- Regulatory reminder -->
    <div class="info-box danger">
      <p style="font-weight:600;font-size:10.5px;color:#CC0000;">
        Rappel réglementaire : en cas de non-respect de vos obligations de certification périodique, 
        votre Ordre peut engager une procédure disciplinaire. Ce document vous aide à anticiper — 
        agissez maintenant.
      </p>
    </div>
  </div>
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>


<!-- ══════════════════════════════════════════════════════════════════ -->
<!-- PAGE 6 — À PROPOS + CTA                                          -->
<!-- ══════════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <img src="data:image/png;base64,${logo}" alt="Médéré"/>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="opacity:0.15;width:40px;height:40px;">${getSvgContent('heart.svg')}</div>
        <span class="page-num">Page 6 / 6</span>
      </div>
    </div>

    <!-- Grand logo -->
    <img src="data:image/png;base64,${logo}" 
         style="width:120px;height:auto;margin-bottom:16px;" 
         alt="Médéré"/>

    <p style="font-size:11px;font-style:italic;color:#554F4F;line-height:1.6;margin-bottom:24px;">
      Médéré est le seul organisme de formation fondé et dirigé par un médecin, 
      le Dr&nbsp;Harry Sitbon, qui ne vend que des formations conformes aux 
      référentiels officiels de certification périodique.
    </p>

    <h3 style="font-size:14px;margin-bottom:16px;">Nos garanties réglementaires</h3>

    <!-- Check items -->
    <div class="check-item">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="${prof.color}" opacity="0.12"/>
        <path d="M7 12.5L10.5 16L17 9" stroke="${prof.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="check-text">Comité scientifique identifié — fondateur médecin (Dr Harry Sitbon)</span>
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
      <span class="check-text">Méthodes HAS de référence — Qualiopi certifié</span>
    </div>

    <!-- CTA -->
    <div class="cta-block" style="background:${prof.color};margin-top:28px;">
      <h3>Prenez rendez-vous avec un conseiller Médéré</h3>
      <div class="cta-row">
        <span class="cta-label">Tél.</span>
        <span class="cta-value">01&nbsp;88&nbsp;33&nbsp;95&nbsp;28</span>
      </div>
      <div class="cta-row">
        <span class="cta-label">Email</span>
        <span class="cta-value">contact@medere.fr</span>
      </div>
      <div class="cta-row">
        <span class="cta-label">Web</span>
        <span class="cta-value">medere.fr</span>
      </div>
    </div>

    <div style="flex:1;"></div>

    <!-- Legal -->
    <p style="font-size:7.5px;font-weight:300;color:#9C9494;text-align:center;line-height:1.5;">
      Basé sur l'arrêté du 26 février 2026 — NOR&nbsp;: SFHH2605575A. 
      Ce document est une estimation indicative. La validation finale de votre certification 
      est prononcée par votre Ordre professionnel.
    </p>
  </div>
  <div class="page-footer">Médéré — Document confidentiel — ${monthYear}</div>
</div>

</body>
</html>`;
}