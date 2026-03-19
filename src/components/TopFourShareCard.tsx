import { Plus } from "lucide-react";

function truncateName(name: string, max = 34): string {
  if (name.length <= max) return name;
  return name.slice(0, max).trimEnd() + "…";
}

interface TopFourShareCardProps {
  displayName: string;
  lounges: {
    name: string;
    cityName: string;
    image_url: string | null;
  }[];
  cardRef: React.RefObject<HTMLDivElement>;
}

const TopFourShareCard = ({ displayName, lounges, cardRef }: TopFourShareCardProps) => {
  const slots = [0, 1, 2, 3];

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
          {displayName}'s
        </p>
        <p className="font-body text-sm text-white/60">Top 4 Lounges</p>
      </div>

      {/* 2×2 grid */}
      <div className="relative z-10 grid grid-cols-2 gap-3 w-full my-6">
        {slots.map((idx) => {
          const lounge = lounges[idx];
          if (lounge) {
            return (
              <div
                key={idx}
                className="relative rounded-xl overflow-hidden aspect-square"
                style={{ backgroundColor: "#2a2a2a" }}
              >
                <img
                  src={lounge.image_url || "/placeholder.svg"}
                  alt={lounge.name}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 pb-2.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)" }}>
                  <p
                    className="font-display font-bold text-white leading-tight mb-0.5"
                    style={{ fontSize: "10.5px", lineHeight: "1.25", maxHeight: "2.5em", overflow: "hidden" }}
                  >
                    {truncateName(lounge.name, 34)}
                  </p>
                  <p className="font-body text-white/60" style={{ fontSize: "9px" }}>
                    {lounge.cityName}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="rounded-xl aspect-square border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#2a2a2a" }}
            >
              <Plus className="h-5 w-5" style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
          );
        })}
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

export default TopFourShareCard;
