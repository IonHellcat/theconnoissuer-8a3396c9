import { Progress } from "@/components/ui/progress";

interface ScoreStatsProps {
  stats: {
    total: number;
    estimated: number;
    verified: number;
    none: number;
    noReviews: number;
    withPlaceId: number;
  };
}

export const ScoreStats = ({ stats }: ScoreStatsProps) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <p className="text-2xl font-bold font-display text-foreground">{stats.total}</p>
        <p className="text-xs text-muted-foreground font-body">Total Lounges</p>
      </div>
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <p className="text-2xl font-bold font-display text-green-400">{stats.estimated}</p>
        <p className="text-xs text-muted-foreground font-body">Estimated</p>
      </div>
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <p className="text-2xl font-bold font-display text-blue-400">{stats.verified}</p>
        <p className="text-xs text-muted-foreground font-body">Verified</p>
      </div>
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <p className="text-2xl font-bold font-display text-destructive">{stats.none}</p>
        <p className="text-xs text-muted-foreground font-body">No Score</p>
      </div>
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <p className="text-2xl font-bold font-display text-primary">{stats.noReviews}</p>
        <p className="text-xs text-muted-foreground font-body">No Reviews</p>
      </div>
    </div>

    <div className="mb-6">
      <div className="flex justify-between text-xs text-muted-foreground font-body mb-1">
        <span>Score Coverage</span>
        <span>{Math.round(((stats.estimated + stats.verified) / stats.total) * 100)}%</span>
      </div>
      <Progress value={((stats.estimated + stats.verified) / stats.total) * 100} />
    </div>
  </>
);
