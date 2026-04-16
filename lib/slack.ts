// Notification Slack via webhook entrante
// L'URL vient UNIQUEMENT de process.env.SLACK_WEBHOOK_URL — jamais en dur
// L'envoi Slack ne bloque jamais la réponse API (fire-and-forget)

export type SlackPayload = {
  type: 'lead' | 'rdv';
  email: string;
  phone?: string;
  profession: string;
  professionLabel: string;
  score: number;
  urgency: string;
  // Champs RDV uniquement
  nom?: string;
  prenom?: string;
  jourRappel?: string;
  heureRappel?: string;
  message?: string;
};

function urgencyLabel(urgency: string): string {
  if (urgency === 'rouge')  return 'Situation critique';
  if (urgency === 'orange') return 'En cours';
  return 'Bien avancé';
}

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const mois  = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

export async function sendSlackNotification(payload: SlackPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[SLACK] Webhook non configuré, notification ignorée');
    return;
  }

  const urgencyEmoji =
    payload.urgency === 'rouge'  ? '🔴'
    : payload.urgency === 'orange' ? '🟠'
    : '🟢';

  const label = urgencyLabel(payload.urgency);

  let body: object;

  if (payload.type === 'lead') {
    body = {
      text: `Nouveau lead — ${payload.professionLabel} — Score ${payload.score}/8`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `${urgencyEmoji} *Nouveau lead simulateur*` },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Profession*\n${payload.professionLabel}` },
            { type: 'mrkdwn', text: `*Score*\n${payload.score}/8 · ${label}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Email*\n${payload.email}` },
            { type: 'mrkdwn', text: `*Téléphone*\n${payload.phone || '—'}` },
          ],
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '📄 Rapport PDF envoyé · Fiche HubSpot créée' },
          ],
        },
      ],
    };
  } else {
    const jourFormate = payload.jourRappel ? formatDateFr(payload.jourRappel) : '';

    body = {
      text: `Demande de rappel — ${payload.prenom} ${payload.nom} — ${payload.professionLabel}`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '📅 *Demande de rappel*' },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Nom*\n${payload.prenom} ${payload.nom}` },
            { type: 'mrkdwn', text: `*Profession*\n${payload.professionLabel}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Email*\n${payload.email}` },
            { type: 'mrkdwn', text: `*Téléphone*\n${payload.phone || '—'}` },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Rappel souhaité*\n🗓 ${jourFormate} · ${payload.heureRappel}`,
            },
            {
              type: 'mrkdwn',
              text: `*Score*\n${urgencyEmoji} ${payload.score}/8 · ${label}`,
            },
          ],
        },
        ...(payload.message
          ? [
              { type: 'divider' },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Message du PS*\n>${payload.message}` },
              },
            ]
          : []),
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '📋 Fiche HubSpot mise à jour' },
          ],
        },
      ],
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error('[SLACK] Erreur webhook:', response.status);
    } else {
      console.log('[SLACK] Notification envoyée:', payload.type);
    }
  } catch (error) {
    console.error('[SLACK] Erreur envoi:', error);
    // Ne pas bloquer le process si Slack échoue
  }
}
