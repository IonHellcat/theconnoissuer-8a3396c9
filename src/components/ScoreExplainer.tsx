import { Info, Star, Trophy, BarChart3, MessageSquare } from "lucide-react";

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
            Connoisseur Score
          </div>
          <p>A deterministic 0-100 score computed from five weighted components: Rating Quality (42%), Review Sentiment (30%), Prestige (12%), Review Volume (8%), and Rating Consistency (8%).</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-foreground font-semibold font-display">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Sentiment Analysis
          </div>
          <p>AI classifies each review's sentiment per aspect (atmosphere, service, selection, etc.) as positive, negative, or not mentioned — no subjective ratings.</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-foreground font-semibold font-display">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Confidence Level
          </div>
          <p>Scores show a confidence indicator based on review count: High (10+ reviews), Medium (5-9), or Low (under 5). More reviews = more reliable scores.</p>
        </div>
        <div className="space-y-1">
          <span className="text-foreground font-semibold font-display text-xs">Estimated vs Verified</span>
          <p>Estimated scores <span className="inline-block h-3 w-3 rounded-full border border-dashed border-muted-foreground/40 align-middle mx-0.5" /> are computed from public reviews. Verified scores <span className="inline-block h-3 w-3 rounded-full border-2 border-primary shadow-[0_0_6px_hsl(var(--primary)/0.3)] align-middle mx-0.5" /> come from community ratings.</p>
        </div>
      </div>
    </div>
  );
};

export default ScoreExplainer;
