// Indicateur par bloc/axe - statut, score, mention "Nouveau" pour blocs 3 & 4
// animDelay : délai en ms pour l'apparition en cascade (staggered)

import type { DimensionStatus } from "@/lib/scoring";

type StatusConfig = {
  icon: string;
  label: string;
  iconBg: string;
  iconColor: string;
  scoreBg: string;
  scoreColor: string;
};

const STATUS_CONFIG: Record<DimensionStatus, StatusConfig> = {
  valide: {
    icon: "✓",
    label: "Validé",
    iconBg: "#DCFCE7",
    iconColor: "#2DA131",
    scoreBg: "#DCFCE7",
    scoreColor: "#166534",
  },
  en_cours: {
    icon: "◑",
    label: "En cours",
    iconBg: "#FFF7ED",
    iconColor: "#EA6C00",
    scoreBg: "#FFF7ED",
    scoreColor: "#9A3412",
  },
  a_faire: {
    icon: "–",
    label: "À faire",
    iconBg: "#F0EAE5",
    iconColor: "#9C9494",
    scoreBg: "#F0EAE5",
    scoreColor: "#554F4F",
  },
};

type BlocStatusProps = {
  index: number;
  dimensionLabel: "Bloc" | "Axe";
  name: string;
  score: number;
  status: DimensionStatus;
  isNew?: boolean;
  animDelay?: number; // millisecondes - pour l'animation en cascade
};

export default function BlocStatus({
  index,
  dimensionLabel,
  name,
  score,
  status,
  isNew = false,
  animDelay = 0,
}: BlocStatusProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className="animate-bloc-in flex items-center gap-3 rounded-xl border border-[#DBD6CD] bg-white px-4 py-3.5"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Icône statut */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: cfg.iconBg, color: cfg.iconColor }}
        aria-hidden="true"
      >
        {cfg.icon}
      </div>

      {/* Contenu texte */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-[#302D2D]">
          {dimensionLabel}&nbsp;{index}&nbsp;-&nbsp;{name}
        </p>
        <p className="mt-0.5 text-xs text-[#686162]">
          {isNew
            ? "Nouveau - créé par la certification périodique"
            : cfg.label}
        </p>
      </div>

      {/* Badge score + badge Nouveau */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
          style={{ backgroundColor: cfg.scoreBg, color: cfg.scoreColor }}
        >
          {score}/2
        </span>
        {isNew && (
          <span className="rounded-full bg-[#F0EAE5] px-2 py-0.5 text-xs font-semibold text-[#807778]">
            Nouveau
          </span>
        )}
      </div>
    </div>
  );
}
