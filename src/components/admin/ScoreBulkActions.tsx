import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, Save, Zap, Trash2, Pause, Play } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BulkBootstrapProgress {
  scored: number;
  no_reviews: number;
  errors: number;
  remaining: number;
  total: number;
}

interface ScoreBulkActionsProps {
  bulkBootstrapping: boolean;
  bulkBootstrapProgress: BulkBootstrapProgress | null;
  bulkRescoring: boolean;
  bulkServerProgress: { processed: number; total: number } | null;
  unscoredCount: number;
  estimatedCount: number;
  editedCount: number;
  loungeCount: number;
  paused: boolean;
  onBulkBootstrap: () => void;
  onBulkRescore: () => void;
  onBulkSaveAll: () => void;
  onResetAllScores?: () => void;
  onTogglePause: () => void;
  resetting?: boolean;
}

export const ScoreBulkActions = ({
  bulkBootstrapping, bulkBootstrapProgress,
  bulkRescoring, bulkServerProgress,
  unscoredCount, estimatedCount, editedCount, loungeCount,
  paused, onBulkBootstrap, onBulkRescore, onBulkSaveAll, onResetAllScores, onTogglePause, resetting,
}: ScoreBulkActionsProps) => {
  const anyRunning = bulkBootstrapping || bulkRescoring || !!resetting;

  return (
    <>
        <div className="flex gap-2 mb-6 flex-wrap">
        {(bulkBootstrapping || bulkRescoring) && (
          <Button onClick={onTogglePause} variant={paused ? "default" : "outline"} className="gap-2">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
        <Button onClick={onBulkBootstrap} disabled={anyRunning || !unscoredCount} className="gap-2">
          {bulkBootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Score All Unscored ({unscoredCount})
        </Button>
        <Button
          onClick={onBulkRescore}
          disabled={anyRunning || !estimatedCount}
          variant="secondary"
          className="gap-2"
        >
          {bulkRescoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Re-score Estimated ({estimatedCount})
        </Button>
        {editedCount > 0 && (
          <Button onClick={onBulkSaveAll} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Approve All ({editedCount})
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={anyRunning || !loungeCount} className="gap-2">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Reset All Scores
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all scores?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear connoisseur_score, pillar_scores, score_label, score_summary, confidence, and review_data_count for <strong>all lounges</strong>, and delete all cached review classifications. Score source will be set back to "none". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onResetAllScores}>Yes, reset everything</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Bulk Bootstrap Progress */}
      {bulkBootstrapping && (
        <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Full pipeline in progress...</p>
              <p className="text-xs text-muted-foreground font-body">
                {bulkBootstrapProgress
                  ? `✓ ${bulkBootstrapProgress.scored} scored · ${bulkBootstrapProgress.no_reviews} no reviews · ${bulkBootstrapProgress.errors} errors · ${bulkBootstrapProgress.remaining} remaining`
                  : "Starting full pipeline (fetch → classify → compute → summarize)..."}
              </p>
            </div>
            {bulkBootstrapProgress && bulkBootstrapProgress.total > 0 && (
              <span className="text-sm font-bold font-display text-primary">
                {Math.round(((bulkBootstrapProgress.total - bulkBootstrapProgress.remaining) / bulkBootstrapProgress.total) * 100)}%
              </span>
            )}
          </div>
          {bulkBootstrapProgress && bulkBootstrapProgress.total > 0 && (
            <Progress value={((bulkBootstrapProgress.total - bulkBootstrapProgress.remaining) / bulkBootstrapProgress.total) * 100} />
          )}
        </div>
      )}

      {/* Re-score Progress */}
      {bulkRescoring && (
        <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Bulk rescore in progress...</p>
              <p className="text-xs text-muted-foreground font-body">
                {bulkServerProgress
                  ? `Processed ${bulkServerProgress.processed} of ${bulkServerProgress.total} estimated venues.`
                  : `Starting bulk rescore of ${estimatedCount} estimated venues...`}
              </p>
            </div>
            {bulkServerProgress && (
              <span className="text-sm font-bold font-display text-primary">
                {Math.round((bulkServerProgress.processed / bulkServerProgress.total) * 100)}%
              </span>
            )}
          </div>
          {bulkServerProgress && (
            <Progress value={(bulkServerProgress.processed / bulkServerProgress.total) * 100} />
          )}
        </div>
      )}
    </>
  );
};
