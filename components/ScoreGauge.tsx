"use client";

// Jauge semi-circulaire animée — stroke-dashoffset reveal en 800ms ease-out
// Technique : arc complet en fond + overlay coloré masqué par stroke-dashoffset

import { useState, useEffect } from "react";
import type { Urgency } from "@/lib/scoring";

export const URGENCY_CONFIG: Record<
  Urgency,
  { color: string; bgLight: string; label: string }
> = {
  rouge: {
    color: "#CC0000",
    bgLight: "#FEF2F2",
    label: "Situation critique — actions urgentes nécessaires",
  },
  orange: {
    color: "#EA6C00",
    bgLight: "#FFF7ED",
    label: "En cours — des actions restent à réaliser",
  },
  vert: {
    color: "#2DA131",
    bgLight: "#F0FDF4",
    label: "Bien avancé — quelques ajustements",
  },
};

// Longueur exacte du demi-cercle (rayon 80) : π × r
const TOTAL_ARC = Math.PI * 80; // ≈ 251.33

type ScoreGaugeProps = {
  score: number;
  maxScore: number;
  urgency: Urgency;
};

export default function ScoreGauge({ score, maxScore, urgency }: ScoreGaugeProps) {
  const config = URGENCY_CONFIG[urgency];
  const percentage = score / maxScore;

  // Arc complet toujours dessiné ; stroke-dashoffset contrôle la portion visible
  // dashoffset = TOTAL_ARC × (1 − percentage) → 0 = tout visible, TOTAL_ARC = rien
  const targetOffset = TOTAL_ARC * (1 - percentage);

  // Démarre masqué (offset = TOTAL_ARC), puis passe à la valeur cible en 800ms
  const [offset, setOffset] = useState(TOTAL_ARC);

  useEffect(() => {
    const t = setTimeout(() => setOffset(targetOffset), 80); // léger délai pour trigger la transition
    return () => clearTimeout(t);
  }, [targetOffset]);

  const cx = 100, cy = 105, r = 80;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG gauge */}
      <div className="w-52 sm:w-60" aria-hidden="true">
        <svg viewBox="0 0 200 115" className="w-full">
          {/* Fond neutre — arc complet statique */}
          <path
            d={arcPath}
            fill="none"
            stroke="#DBD6CD"
            strokeWidth={18}
            strokeLinecap="round"
          />

          {/* Remplissage animé — même arc, stroke-dashoffset contrôle la longueur */}
          <path
            d={arcPath}
            fill="none"
            stroke={config.color}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={TOTAL_ARC}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 800ms ease-out" }}
          />

          {/* Score — fade-in avec l'arc */}
          <text
            x="100"
            y="86"
            textAnchor="middle"
            fontSize="36"
            fontWeight="700"
            fill={config.color}
            fontFamily="Aileron, system-ui, sans-serif"
            style={{
              opacity: offset < TOTAL_ARC ? 1 : 0,
              transition: "opacity 400ms ease-out 300ms",
            }}
          >
            {score}
          </text>
          <text
            x="100"
            y="106"
            textAnchor="middle"
            fontSize="13"
            fill="#807778"
            fontFamily="Aileron, system-ui, sans-serif"
          >
            sur {maxScore}
          </text>
        </svg>
      </div>

      {/* Label d'urgence */}
      <span
        className="rounded-full px-4 py-1.5 text-center text-sm font-semibold leading-snug"
        style={{ backgroundColor: config.bgLight, color: config.color }}
      >
        {config.label}
      </span>

      <p className="sr-only">
        Score : {score} sur {maxScore}. {config.label}.
      </p>
    </div>
  );
}
