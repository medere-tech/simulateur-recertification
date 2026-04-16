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

export async function sendSlackNotification(payload: SlackPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[SLACK] Webhook non configuré, notification ignorée');
    return;
  }

  const urgencyEmoji =
    payload.urgency === 'rouge' ? '🔴'
    : payload.urgency === 'orange' ? '🟠'
    : '🟢';

  let body: object;

  if (payload.type === 'lead') {
    body = {
      text: `${urgencyEmoji} Nouveau lead — ${payload.professionLabel} — Score ${payload.score}/8`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${urgencyEmoji} Nouveau lead — ${payload.professionLabel}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Score :*\n${payload.score}/8` },
            { type: 'mrkdwn', text: `*Urgence :*\n${payload.urgency}` },
            { type: 'mrkdwn', text: `*Email :*\n${payload.email}` },
            { type: 'mrkdwn', text: `*Tél :*\n${payload.phone || 'Non renseigné'}` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '📄 Rapport PDF envoyé automatiquement' },
          ],
        },
      ],
    };
  } else {
    body = {
      text: `📅 Demande de RDV — ${payload.prenom} ${payload.nom} — ${payload.professionLabel}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📅 Demande de rappel — ${payload.professionLabel}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Nom :*\n${payload.prenom} ${payload.nom}` },
            { type: 'mrkdwn', text: `*Score :*\n${payload.score}/8` },
            { type: 'mrkdwn', text: `*Email :*\n${payload.email}` },
            { type: 'mrkdwn', text: `*Tél :*\n${payload.phone || 'Non renseigné'}` },
            {
              type: 'mrkdwn',
              text: `*Rappel souhaité :*\n${payload.jourRappel} à ${payload.heureRappel}`,
            },
          ],
        },
        ...(payload.message
          ? [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Message :*\n${payload.message}` },
              },
            ]
          : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `${urgencyEmoji} Urgence : ${payload.urgency} — Score : ${payload.score}/8`,
            },
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
