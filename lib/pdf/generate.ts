// Génération du buffer PDF — côté serveur (Node.js runtime)
// Target : < 3s de génération

import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { ReportTemplate, type ReportTemplateProps } from "./ReportTemplate";

export type ReportData = Omit<ReportTemplateProps, "logoDataUri">;

let cachedLogoDataUri: string | null = null;

function getLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const logoPath = path.join(process.cwd(), "public", "images", "logo-medere-black.png");
  const logoBuffer = fs.readFileSync(logoPath);
  cachedLogoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  return cachedLogoDataUri;
}

export async function generateReport(data: ReportData): Promise<Buffer> {
  const logoDataUri = getLogoDataUri();

  const element = React.createElement(ReportTemplate, {
    ...data,
    logoDataUri,
  });

  const buffer = await renderToBuffer(
    element as React.ReactElement<DocumentProps>
  );
  return Buffer.from(buffer);
}
