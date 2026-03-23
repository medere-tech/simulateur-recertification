// Génération PDF via Puppeteer (remplace @react-pdf/renderer)
// Cible : Vercel serverless + développement local Windows/Mac/Linux

import fs   from "fs";
import path from "path";
import { getReportHTML, type ReportData } from "./template";

export type { ReportData };

// ─── Chemin vers l'exécutable Chromium ───────────────────────────────────────

async function getExecutablePath(): Promise<string> {
  // 1. Override explicite (pratique pour le dev local)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Chemins Chrome locaux (Windows, Mac, Linux)
  const localPaths = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];

  for (const p of localPaths) {
    if (p && fs.existsSync(p)) return p;
  }

  // 3. @sparticuz/chromium (Vercel / AWS Lambda)
  const { default: chromium } = await import("@sparticuz/chromium");
  return chromium.executablePath();
}

// ─── Génération du PDF ────────────────────────────────────────────────────────

export async function generateReport(data: ReportData): Promise<Buffer> {
  // Import dynamique pour éviter les problèmes de bundle côté client
  const puppeteer = (await import("puppeteer-core")).default;

  const { default: chromium } = await import("@sparticuz/chromium");
  const executablePath = await getExecutablePath();

  const browser = await puppeteer.launch({
    args:            [...chromium.args, "--disable-web-security"],
    defaultViewport: { width: 1240, height: 1754 },
    executablePath:  executablePath,
    headless:        true,
  });

  try {
    const page = await browser.newPage();
    const html = getReportHTML(data);

    // setContent est plus rapide que goto pour du HTML inline
    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      format:          "A4",
      printBackground: true,           // OBLIGATOIRE pour les fonds colorés
      margin:          { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
