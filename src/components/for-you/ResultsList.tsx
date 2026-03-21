import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Cigarette, MapPin, RotateCcw, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import OptimizedImage from "@/components/OptimizedImage";
import ItineraryShareModal from "./ItineraryShareModal";
import type { LoungeWithCoords } from "@/lib/recommendations";

interface ItineraryScreenProps {
  itinerary: LoungeWithCoords[];
  cityName: string;
  requestedStops: number;
  onReset: () => void;
}

function getStopLabel(index: number, lounge: LoungeWithCoords): string {
  const t = (lounge.type || "lounge").toLowerCase();
  if (index === 0 && (t === "shop" || t === "both")) return "Start here — pick up your cigars";
  if (index === 0) return "Your main destination";
  return `Stop ${index + 1}`;
}

export const ItineraryScreen = ({ itinerary, cityName, requestedStops, onReset }: ItineraryScreenProps) => {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" />
          <span className="text-xs font-body uppercase tracking-widest">Your Itinerary</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {cityName}
        </h1>
        <p className="text-muted-foreground font-body text-xs">
          {itinerary.length} curated stop{itinerary.length !== 1 ? "s" : ""} · ranked by Connoisseur Score
        </p>
        <div className="mx-auto w-12 h-px bg-primary/30 mt-1" />
      </motion.div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-primary/20" />

        <div className="flex flex-col gap-4">
          {itinerary.map((lounge, i) => (
            <motion.div
              key={lounge.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.35, duration: 0.45 }}
            >
              <Link to={`/lounge/${lounge.slug}`} className="block group">
                <div className="flex gap-3">
                  {/* Timeline node */}
                  <div className="flex-shrink-0 w-10 flex flex-col items-center pt-4">
                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-display font-bold ${
                      i === 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/40 bg-card text-primary/60"
                    }`}>
                      {i + 1}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 rounded-xl bg-card border border-border/50 overflow-hidden group-hover:border-primary/30 transition-colors group-active:scale-[0.98] transition-transform">
                    {/* Image banner */}
                    <div className="h-24 w-full relative">
                      {lounge.image_url ? (
                        <OptimizedImage
                          src={lounge.image_url_cached || lounge.image_url}
                          alt={lounge.name}
                          width={400}
                          height={192}
                          sizes="(max-width: 448px) calc(100vw - 72px), 376px"
                          widths={[376, 752]}
                          className="h-full w-full object-cover"
                          loungeId={lounge.id}
                        />
                      ) : (
                        <div className="h-full w-full bg-secondary flex items-center justify-center">
                          <Cigarette className="h-6 w-6 text-muted-foreground/20" />
                        </div>
                      )}
                      {/* Gradient fade */}
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                    </div>

                    {/* Details */}
                    <div className="px-3 pb-3 pt-2">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-display text-sm font-semibold text-foreground truncate">
                              {lounge.name}
                            </h3>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 capitalize border-primary/30 text-primary/80">
                              {lounge.type}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-primary/70 font-body font-medium mt-0.5">
                            {getStopLabel(i, lounge)}
                          </p>
                        </div>
                        <div className="pt-1 shrink-0">
                          <ConnoisseurScoreBadge
                            score={lounge.connoisseur_score}
                            scoreLabel={lounge.score_label}
                            scoreSource={lounge.score_source}
                            googleRating={lounge.rating}
                            size="sm"
                          />
                        </div>
                      </div>
                      {lounge.score_summary && (
                        <p className="text-[11px] text-muted-foreground/60 font-body italic mt-1 line-clamp-2 leading-relaxed">
                          "{lounge.score_summary}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fewer stops notice */}
      {itinerary.length < requestedStops && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + itinerary.length * 0.35 }}
          className="text-xs text-muted-foreground font-body text-center py-2"
        >
          Only {itinerary.length} scored venue{itinerary.length !== 1 ? "s" : ""} in {cityName} — more coming soon.
        </motion.p>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + itinerary.length * 0.35 + 0.2 }}
        className="flex gap-3 mb-20"
      >
        <Button
          variant="outline"
          className="flex-1 h-11 font-body text-sm gap-2 border-border/50"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Start Over
        </Button>
        <Button
          className="flex-1 h-11 font-body text-sm gap-2 bg-primary text-primary-foreground hover:brightness-110"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </motion.div>

      <ItineraryShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        cityName={cityName}
        itinerary={itinerary}
      />
    </div>
    </>
  );
};

