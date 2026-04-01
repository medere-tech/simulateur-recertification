// Génération PDF via Puppeteer (remplace @react-pdf/renderer)
// Cible : Vercel serverless + développement local Windows/Mac/Linux

import fs   from "fs";
import path from "path";
import { getReportHTML, type ReportData } from "./template";

export type { ReportData };

// ─── Génération du PDF ────────────────────────────────────────────────────────

export async function generateReport(data: ReportData): Promise<Buffer> {
  const puppeteer = (await import("puppeteer-core")).default;

  const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  let browser;

  if (isVercel) {
    // ── Production Vercel / AWS Lambda ──────────────────────────────────────
    const { default: chromium } = await import("@sparticuz/chromium");

    browser = await puppeteer.launch({
      args:            chromium.args,
      defaultViewport: { width: 1240, height: 1754 },
      executablePath:  await chromium.executablePath(),
      headless:        true,
    });
  } else {
    // ── Développement local (Chrome installé) ────────────────────────────────
    const localPaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
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
    ].filter(Boolean) as string[];

    const executablePath = localPaths.find((p) => fs.existsSync(p));
    if (!executablePath) {
      throw new Error("Chrome introuvable. Définissez PUPPETEER_EXECUTABLE_PATH.");
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args:     ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1240, height: 1754 },
    });
  }

  try {
    const page = await browser.newPage();
    const html = getReportHTML(data);

    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin:          { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
