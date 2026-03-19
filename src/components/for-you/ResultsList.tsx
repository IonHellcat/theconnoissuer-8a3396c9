import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Cigarette } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import OptimizedImage from "@/components/OptimizedImage";
import type { LoungeWithCoords } from "@/lib/recommendations";

interface ItineraryScreenProps {
  itinerary: LoungeWithCoords[];
  cityName: string;
  requestedStops: number;
  onReset: () => void;
}

function getStopLabel(index: number, lounge: LoungeWithCoords, total: number): string {
  const t = (lounge.type || "lounge").toLowerCase();
  if (index === 0 && (t === "shop" || t === "both")) return "Start here — pick up your cigars";
  if (index === 0) return "Your main destination";
  return `Stop ${String(index + 1).padStart(2, "0")}`;
}

export const ItineraryScreen = ({ itinerary, cityName, requestedStops, onReset }: ItineraryScreenProps) => {
  const handleShare = () => {
    const lines = itinerary.map((l, i) => `${i + 1}. ${l.name}`).join("\n");
    const text = `My cigar itinerary in ${cityName}:\n${lines}\nvia The Connoisseur — theconnoisseur.app`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Itinerary copied to clipboard");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Your {cityName} Itinerary
        </h1>
        <p className="text-muted-foreground font-body text-sm mt-1">
          {itinerary.length} stop{itinerary.length !== 1 ? "s" : ""} selected for you
        </p>
      </div>

      {/* Stop cards */}
      <div className="flex flex-col gap-3">
        {itinerary.map((lounge, i) => (
          <motion.div
            key={lounge.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.4, duration: 0.5 }}
          >
            <Link to={`/lounge/${lounge.slug}`}>
              <Card className="relative overflow-hidden border-l-4 border-l-primary bg-card p-4 hover:border-l-primary/80 transition-colors active:scale-[0.98]">
                <div className="flex gap-3">
                  {/* Stop number */}
                  <div className="flex-shrink-0 w-8">
                    <span className="font-display text-2xl font-bold text-primary/40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-sm font-semibold text-foreground truncate">
                            {lounge.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 capitalize border-border/50">
                            {lounge.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                          {getStopLabel(i, lounge, itinerary.length)}
                        </p>
                        {lounge.score_summary && (
                          <p className="text-[11px] text-muted-foreground/70 font-body italic mt-1 line-clamp-2">
                            "{lounge.score_summary}"
                          </p>
                        )}
                      </div>

                      {/* Image */}
                      <div className="h-20 w-20 rounded-lg overflow-hidden flex-shrink-0">
                        {lounge.image_url ? (
                          <OptimizedImage
                            src={lounge.image_url}
                            alt={lounge.name}
                            width={160}
                            height={160}
                            sizes="80px"
                            widths={[80, 160]}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-secondary flex items-center justify-center">
                            <Cigarette className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="mt-2">
                      <ConnoisseurScoreBadge
                        score={lounge.connoisseur_score}
                        scoreLabel={lounge.score_label}
                        scoreSource={lounge.score_source}
                        googleRating={lounge.rating}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Fewer stops notice */}
      {itinerary.length < requestedStops && (
        <p className="text-xs text-muted-foreground font-body text-center">
          Only {itinerary.length} scored venue{itinerary.length !== 1 ? "s" : ""} available in {cityName} — more coming soon.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-20">
        <Button variant="outline" className="flex-1 h-12 font-body" onClick={onReset}>
          Start Over
        </Button>
        <Button className="flex-1 h-12 font-body bg-primary text-primary-foreground hover:brightness-110" onClick={handleShare}>
          Share Itinerary
        </Button>
      </div>
    </div>
  );
};
