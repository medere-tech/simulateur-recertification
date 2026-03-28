// Helper events GA4 - Propriété G-4QX8DR7DPS
// Source : specs-techniques.md

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GtagEvent = {
  event: string;
  params?: Record<string, unknown>;
};

function track({ event, params = {} }: GtagEvent) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

export const GA4 = {
  simulatorStart: (source: string) =>
    track({ event: "simulator_start", params: { source } }),

  stepCompleted: (stepNumber: number, stepValue: string, stepName?: string) =>
    track({
      event: "step_completed",
      params: {
        step_number: stepNumber,
        ...(stepName ? { step_name: stepName } : {}),
        step_value: stepValue,
      },
    }),

  resultViewed: (params: {
    score: number;
    profession: string;
    urgencyLevel: string;
    diplomaRange: string;
  }) =>
    track({
      event: "result_viewed",
      params: {
        score: params.score,
        profession: params.profession,
        urgency_level: params.urgencyLevel,
        diploma_range: params.diplomaRange,
      },
    }),

  emailCaptured: (profession: string, score: number, source: string) =>
    track({
      event: "email_captured",
      params: { profession, score, source },
    }),

  phoneCaptured: (profession: string, score: number) =>
    track({ event: "phone_captured", params: { profession, score } }),

  rdvClicked: (profession: string, score: number) =>
    track({ event: "rdv_clicked", params: { profession, score } }),

  scrollDepth: (percentage: 25 | 50 | 75 | 100) =>
    track({ event: "scroll_depth", params: { percentage } }),

  pdfGenerated: (profession: string, score: number) =>
    track({ event: "pdf_generated", params: { profession, score } }),
};
