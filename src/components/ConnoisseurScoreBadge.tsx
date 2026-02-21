import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnoisseurScoreBadgeProps {
  score: number | null;
  scoreLabel: string | null;
  scoreSource: string;
  scoreSummary?: string | null;
  googleRating?: number;
  size?: "sm" | "md" | "lg";
  showSummary?: boolean;
}

const ConnoisseurScoreBadge = ({
  score,
  scoreLabel,
  scoreSource,
  scoreSummary,
  googleRating,
  size = "sm",
  showSummary = false,
}: ConnoisseurScoreBadgeProps) => {
  const isEstimated = scoreSource === "estimated";
  const isVerified = scoreSource === "verified";
  const hasScore = (isEstimated || isVerified) && score !== null;

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-20 w-20 text-2xl",
  };

  const labelSizeClasses = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  if (!hasScore) {
    // No score — show Google rating fallback
    if (googleRating) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs font-body font-medium">G</span>
            <span className="text-xs font-body">★</span>
            <span className="text-xs font-semibold font-body">{Number(googleRating).toFixed(1)}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-display font-bold ${
              isVerified
                ? "border-2 border-solid border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                : "border-2 border-dashed border-muted-foreground/40 opacity-60"
            }`}
          >
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {isEstimated ? (
            <p className="text-xs font-body">
              Estimated Score — Based on analysis of public reviews. Becomes verified when 3+ members submit detailed ratings.
            </p>
          ) : (
            <p className="text-xs font-body">
              Verified Connoisseur Score — Based on member reviews.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
      <span
        className={`${labelSizeClasses[size]} font-body font-medium leading-none ${
          isVerified ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {isVerified ? scoreLabel : "Est."}
      </span>
      {showSummary && scoreSummary && (
        <p className="text-xs font-body italic text-muted-foreground mt-1 line-clamp-1 max-w-[200px] text-center">
          {scoreSummary}
        </p>
      )}
    </div>
  );
};

export default ConnoisseurScoreBadge;
