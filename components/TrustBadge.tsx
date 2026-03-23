// Badge de confiance - "Organisme certifié DPC • Qualiopi"
// Responsive : label court sur mobile, label complet sur sm+

type TrustBadgeProps = {
  number?: boolean; // Affiche le numéro d'agrément (DPC n°9262)
  className?: string;
};

export default function TrustBadge({ number = false, className = "" }: TrustBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#DBD6CD] bg-white px-3 py-1 text-xs font-semibold text-[#554F4F] ${className}`}
    >
      {/* Pastille verte DPC */}
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-shrink-0 rounded-full bg-[#2DA131]"
      />
      {/* Mobile : label court */}
      <span className="sm:hidden">DPC&nbsp;• Qualiopi</span>
      {/* sm+ : label complet */}
      <span className="hidden sm:inline">
        {number
          ? "Organisme certifié DPC n°9262\u00a0• Qualiopi"
          : "Organisme certifié DPC\u00a0• Qualiopi"}
      </span>
    </span>
  );
}
