import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnoisseurScoreBadgeProps {
  score: number | null;
  scoreLabel: string | null;
  scoreSource: string;
  scoreSummary?: string | null;
  googleRating?: number;
  confidence?: string | null;
  size?: "sm" | "md" | "lg";
  showSummary?: boolean;
}

const ConnoisseurScoreBadge = ({
  score,
  scoreLabel,
  scoreSource,
  scoreSummary,
  googleRating,
  confidence,
  size = "sm",
  showSummary = false,
}: ConnoisseurScoreBadgeProps) => {
  const isEstimated = scoreSource === "estimated";
  const isVerified = scoreSource === "verified";
  const hasScore = (isEstimated || isVerified) && score !== null;

  const sizeClasses = {
    sm: "h-10 w-10 text-[15px]",
    md: "h-14 w-14 text-xl",
    lg: "h-20 w-20 text-3xl",
  };
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-display font-extrabold tracking-tight ${
              isVerified
                ? "border-2 border-solid border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)] bg-primary/10 text-primary"
                : "border-2 border-dashed border-primary/50 bg-primary/5 text-foreground"
            }`}
          >
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-body">
            {isEstimated
              ? `Estimated Score — Deterministic calculation from review sentiments, rating quality, volume, and consistency. ${confidenceLabel}.`
              : "Verified Connoisseur Score — Based on member reviews."}
          </p>
        </TooltipContent>
      </Tooltip>
      <span
        className={`${labelSizeClasses[size]} font-body font-medium leading-none ${
          isVerified ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {isVerified ? scoreLabel : "Est."}
      </span>
      {confidence && size !== "sm" && (
        <span className={`text-[8px] font-body ${
          confidence === "high" ? "text-green-400" : confidence === "medium" ? "text-yellow-400" : "text-red-400"
        }`}>
          {confidence} conf.
        </span>
      )}
      {showSummary && scoreSummary && (
        <p className="text-xs font-body italic text-muted-foreground mt-1 line-clamp-1 max-w-[200px] text-center">
          {scoreSummary}
        </p>
      )}
    </div>
  );
};

export default ConnoisseurScoreBadge;
