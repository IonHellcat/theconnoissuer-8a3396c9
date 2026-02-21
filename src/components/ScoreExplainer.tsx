import { Info, Star, Trophy } from "lucide-react";

const ScoreExplainer = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Info className="h-4 w-4" />
        <span className="font-display text-sm font-semibold">How We Rank</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-body text-muted-foreground bg-card border border-border/50 rounded-xl p-4 sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-foreground font-semibold font-display">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            City Rankings
          </div>
          <p>Venues are ranked by their Connoisseur Score — a multi-pillar quality assessment. Venues without a score fall back to Google rating and review count.</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-foreground font-semibold font-display">
            <Star className="h-3.5 w-3.5 text-primary" />
            Connoisseur Score
          </div>
          <p>The circular badge is a deeper quality score analyzing reviews across pillars like selection, ambiance, service, drinks, and value — more meaningful than star ratings alone.</p>
        </div>
        <div className="space-y-1">
          <span className="text-foreground font-semibold font-display text-xs">Estimated vs Verified</span>
          <p>Estimated scores <span className="inline-block h-3 w-3 rounded-full border border-dashed border-muted-foreground/40 align-middle mx-0.5" /> are AI-analyzed from public reviews. Verified scores <span className="inline-block h-3 w-3 rounded-full border-2 border-primary shadow-[0_0_6px_hsl(var(--primary)/0.3)] align-middle mx-0.5" /> come from community ratings and carry more weight.</p>
        </div>
        <div className="space-y-1">
          <span className="text-foreground font-semibold font-display text-xs">No Score Shown?</span>
          <p>If a venue doesn't display a score, it simply means there wasn't enough data to rate it fairly — it's not a negative mark.</p>
        </div>
      </div>
    </div>
  );
};

export default ScoreExplainer;
