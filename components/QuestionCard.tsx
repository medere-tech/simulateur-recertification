"use client";

// QuestionCard - rendu liste (étapes 2-4) ou grille (étape profession)
// ProfessionGrid - grille 2 cols mobile / 3 cols desktop avec couleur spécialité

import { useState } from "react";
import Image from "next/image";

export type Choice = {
  id: string;
  label: string;
  emoji?: string;
  icon?: string;
  specialtyColor?: string; // couleur hexadécimale de la spécialité (profession grid)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── ProfessionCard - carte verticale pour la grille étape 1 ─────────────────

type ProfessionCardProps = {
  choice: Choice;
  onSelect: () => void;
};

function ProfessionCard({ choice, onSelect }: ProfessionCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const color = choice.specialtyColor ?? "#006E90";

  function handleClick() {
    setPressed(true);
    setTimeout(() => onSelect(), 100);
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      style={{
        borderColor: hovered ? color : hexToRgba(color, 0.4),
        backgroundColor: hovered ? hexToRgba(color, 0.05) : "#FFFFFF",
        transform: pressed ? "scale(0.97)" : hovered ? "scale(1.03)" : "scale(1)",
        boxShadow: hovered && !pressed
          ? "0 4px 16px rgba(0,0,0,0.10)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 200ms ease-out",
      }}
      className="flex flex-col items-center gap-3 rounded-2xl border-2 p-4 pb-5 text-center text-[#302D2D]"
    >
      {choice.icon && (
        <Image
          src={choice.icon}
          alt=""
          width={56}
          height={56}
          className="h-12 w-12 sm:h-14 sm:w-14"
        />
      )}
      <span className="text-sm font-semibold leading-snug">{choice.label}</span>
    </button>
  );
}

// ─── ProfessionGrid - grille 2 cols mobile / 3 cols desktop ──────────────────

type ProfessionGridProps = {
  question: React.ReactNode;
  choices: Choice[];
  onSelect: (id: string) => void;
  note?: string;
};

export function ProfessionGrid({
  question,
  choices,
  onSelect,
  note,
}: ProfessionGridProps) {
  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-bold leading-snug tracking-tight text-[#302D2D] sm:text-3xl">
        {question}
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {choices.map((choice) => (
          <ProfessionCard
            key={choice.id}
            choice={choice}
            onSelect={() => onSelect(choice.id)}
          />
        ))}
      </div>

      {note && (
        <p className="mt-4 text-sm font-light text-[#807778]">{note}</p>
      )}
    </div>
  );
}

// ─── ChoiceButton - bouton liste pour étapes 2-4 ─────────────────────────────

type ChoiceButtonProps = {
  choice: Choice;
  onSelect: () => void;
  accentColor: string;
};

function ChoiceButton({ choice, onSelect, accentColor }: ChoiceButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  function handleClick() {
    setPressed(true);
    setTimeout(() => onSelect(), 100);
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      style={{
        borderColor: hovered ? accentColor : "#DBD6CD",
        backgroundColor: hovered ? hexToRgba(accentColor, 0.05) : "#FFFFFF",
        transform: pressed ? "scale(0.97)" : hovered ? "scale(1.01)" : "scale(1)",
        boxShadow: hovered && !pressed ? "0 3px 12px rgba(0,0,0,0.08)" : "none",
        transition: "all 200ms ease-out",
      }}
      className="flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left text-[#302D2D]"
    >
      {choice.icon && (
        <Image
          src={choice.icon}
          alt=""
          width={48}
          height={48}
          className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12"
        />
      )}
      {!choice.icon && choice.emoji && (
        <span className="flex-shrink-0 text-2xl leading-none" aria-hidden="true">
          {choice.emoji}
        </span>
      )}
      <span className="text-base font-semibold leading-snug">{choice.label}</span>
    </button>
  );
}

// ─── QuestionCard - liste standard (étapes 2-4) ───────────────────────────────

type QuestionCardProps = {
  question: React.ReactNode;
  subtitle?: string;
  choices: Choice[];
  onSelect: (id: string) => void;
  accentColor?: string;
  note?: string;
};

export default function QuestionCard({
  question,
  subtitle,
  choices,
  onSelect,
  accentColor = "#006E90",
  note,
}: QuestionCardProps) {
  return (
    <div className="w-full">
      <h2 className={`text-2xl font-bold leading-snug tracking-tight text-[#302D2D] sm:text-3xl ${subtitle ? "mb-2" : "mb-6"}`}>
        {question}
      </h2>
      {subtitle && (
        <p className="mb-5 text-sm font-light text-[#807778]">{subtitle}</p>
      )}

      <div className="flex flex-col gap-3">
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            onSelect={() => onSelect(choice.id)}
            accentColor={accentColor}
          />
        ))}
      </div>

      {note && (
        <p className="mt-4 text-sm font-light text-[#807778]">{note}</p>
      )}
    </div>
  );
}
