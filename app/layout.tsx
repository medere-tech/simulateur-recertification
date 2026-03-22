import type { Metadata } from "next";
import Script from "next/script";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const GA_ID = "G-4QX8DR7DPS";

export const metadata: Metadata = {
  title: "Simulateur de certification périodique — Médéré",
  description:
    "Évaluez votre avancement dans la certification périodique en 2 minutes. Gratuit, sans inscription.",
  metadataBase: new URL("https://simulateurdpc.fr"),
  icons: {
    icon: "/images/logo-medere-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Preload polices critiques — Regular + SemiBold (LCP) */}
        <link
          rel="preload"
          href="/fonts/Aileron-Regular.ttf"
          as="font"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Aileron-SemiBold.ttf"
          as="font"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <SiteFooter />

        {/* Google Analytics 4 — afterInteractive pour ne pas bloquer LCP */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: true });
          `}
        </Script>
      </body>
    </html>
  );
}
