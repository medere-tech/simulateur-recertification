// Barre de progression - Étape X sur 5
// Segments colorés en accent de la profession

type ProgressBarProps = {
  currentStep: number;   // 1–5
  totalSteps?: number;   // 5
  accentColor?: string;
};

export default function ProgressBar({
  currentStep,
  totalSteps = 5,
  accentColor = "#006E90",
}: ProgressBarProps) {
  return (
    <div className="w-full px-4 pb-2 pt-4 sm:px-6">
      <p className="mb-2 text-xs font-light text-[#807778]">
        Étape{" "}
        <span className="font-semibold text-[#554F4F]">{currentStep}</span>{" "}
        sur {totalSteps}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < currentStep ? accentColor : "#DBD6CD",
            }}
          />
        ))}
      </div>
    </div>
  );
}
