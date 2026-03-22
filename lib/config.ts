// Configuration centralisée — feature flags + env vars
// Les variables NEXT_PUBLIC_* sont accessibles côté client ET serveur
// Les autres (sans préfixe) sont serveur uniquement

export const CONFIG = {
  // HubSpot — mettre à true en production quand les propriétés sont créées
  HUBSPOT_ENABLED: process.env.NEXT_PUBLIC_HUBSPOT_ENABLED === "true",

  // URL du calendrier HubSpot meetings (lien Jordan)
  HUBSPOT_MEETING_URL:
    process.env.NEXT_PUBLIC_HUBSPOT_MEETING_URL ||
    "https://meetings.hubspot.com/medere",

  // Airtable — catalogue des formations
  AIRTABLE_API_KEY:    process.env.AIRTABLE_API_KEY    || "",
  AIRTABLE_BASE_ID:    process.env.AIRTABLE_BASE_ID    || "",
  AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME || "Formations",
};
