import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headers de sécurité (cf. specs-techniques.md)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Externalise les packages natifs lourds du côté serveur
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Force Vercel à inclure les binaires Chromium dans le bundle /api/report
  outputFileTracingIncludes: {
    "/api/report": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
