function truncateName(name: string, max = 30): string {
  if (name.length <= max) return name;
  return name.slice(0, max).trimEnd() + "…";
}

interface Stop {
  name: string;
  type: string;
  image_url: string | null;
  image_url_cached: string | null;
  connoisseur_score: number | null;
}

interface ItineraryShareCardProps {
  cityName: string;
  stops: Stop[];
  cardRef: React.RefObject<HTMLDivElement>;
}

const ItineraryShareCard = ({ cityName, stops, cardRef }: ItineraryShareCardProps) => {
  return (
    <div
      ref={cardRef}
      className="w-[360px] h-[640px] flex flex-col items-center justify-between p-8 relative overflow-hidden"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: "radial-gradient(ellipse at center, #c4973b 0%, transparent 70%)" }}
      />

      {/* Top branding */}
      <div className="relative z-10 text-center">
        <p
          className="font-display text-xs tracking-[4px] uppercase mb-1"
          style={{ color: "#c4973b" }}
        >
          THE CONNOISSEUR
        </p>
        <p className="font-display text-2xl font-bold text-white">
          {cityName}
        </p>
        <p className="font-body text-sm text-white/60">
          Cigar Itinerary · {stops.length} stop{stops.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stops list */}
      <div className="relative z-10 w-full my-4 flex-1 flex flex-col justify-center gap-2.5">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl overflow-hidden"
            style={{ backgroundColor: "#2a2a2a" }}
          >
            {/* Number badge */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <img
                src={stop.image_url_cached || stop.image_url || "/placeholder.svg"}
                alt={stop.name}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg"
                style={{ color: "#c4973b" }}
              >
                {i + 1}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 pr-3 py-2">
              <p
                className="font-display font-semibold text-white leading-tight"
                style={{ fontSize: "12px" }}
              >
                {truncateName(stop.name)}
              </p>
              <p className="font-body text-white/40 capitalize" style={{ fontSize: "10px" }}>
                {stop.type}
              </p>
            </div>

            {/* Score */}
            {stop.connoisseur_score != null && (
              <div
                className="flex-shrink-0 mr-3 font-display font-bold text-sm"
                style={{ color: "#c4973b" }}
              >
                {stop.connoisseur_score}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom URL */}
      <p
        className="relative z-10 font-body text-xs tracking-wider"
        style={{ color: "rgba(196, 151, 59, 0.6)" }}
      >
        theconnoisseur.app
      </p>
    </div>
  );
};

export default ItineraryShareCard;
