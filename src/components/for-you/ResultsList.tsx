import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import type { RecommendedLounge, VenueType } from "@/lib/recommendations";

type LocationMode = "here" | "travelling" | null;

interface ResultsListProps {
  results: RecommendedLounge[];
  venueType: VenueType;
  locationLabel: string;
  locationMode: LocationMode;
  onReset: () => void;
}

export const ResultsList = ({ results, venueType, locationLabel, locationMode, onReset }: ResultsListProps) => (
  <div className="flex flex-col gap-3">
    {/* Sticky header */}
    <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-body">
          {results.length} {venueType === "All" ? "venue" : venueType.toLowerCase()}{results.length !== 1 ? "s" : ""} in {locationLabel || "your area"}
        </p>
        <button
          onClick={onReset}
          className="text-xs text-primary hover:underline font-body flex items-center gap-1 min-h-[44px] px-2"
        >
          <ArrowLeft className="h-3 w-3" /> Change
        </button>
      </div>
    </div>

    {results.length === 0 && (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-body text-sm">
          No venues found within 50 km. Try a different city.
        </p>
      </div>
    )}

    {results.map((lounge) => (
      <Link key={lounge.id} to={`/lounge/${lounge.slug}`}>
        <Card className="flex items-center gap-3 p-3 hover:border-primary/40 transition-colors active:scale-[0.98]">
          <ConnoisseurScoreBadge
            score={lounge.connoisseur_score}
            scoreLabel={lounge.score_label}
            scoreSource={lounge.score_source}
            googleRating={lounge.rating}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-sm font-semibold text-foreground truncate">{lounge.name}</h3>
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 capitalize border-border/50">
                {lounge.type}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-body truncate">
              {lounge.city_name}{lounge.address ? ` · ${lounge.address}` : ""}
            </p>
          </div>
          <span className="text-[11px] font-body text-muted-foreground whitespace-nowrap shrink-0">
            {locationMode === "travelling"
              ? lounge.city_name
              : `${lounge.distanceKm.toFixed(1)} km`}
          </span>
        </Card>
      </Link>
    ))}
  </div>
);
