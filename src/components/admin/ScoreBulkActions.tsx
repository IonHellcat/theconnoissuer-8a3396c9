import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, Save, Zap } from "lucide-react";

interface ScoreBulkActionsProps {
  bulkProgress: { current: number; total: number; currentName: string } | null;
  bulkRescoring: boolean;
  bulkServerProgress: { processed: number; total: number } | null;
  estimatedCount: number;
  editedCount: number;
  loungeCount: number;
  onBulkBootstrap: () => void;
  onBulkRescore: () => void;
  onBulkSaveAll: () => void;
  onResetAllScores?: () => void;
  resetting?: boolean;
}

export const ScoreBulkActions = ({
  bulkProgress, bulkRescoring, bulkServerProgress,
  estimatedCount, editedCount, loungeCount,
  onBulkBootstrap, onBulkRescore, onBulkSaveAll,
}: ScoreBulkActionsProps) => (
  <>
    <div className="flex gap-2 mb-6 flex-wrap">
      <Button onClick={onBulkBootstrap} disabled={!!bulkProgress || bulkRescoring || !loungeCount} className="gap-2">
        <Wand2 className="h-4 w-4" />
        Bulk Bootstrap (Top 50)
      </Button>
      <Button
        onClick={onBulkRescore}
        disabled={!!bulkProgress || bulkRescoring || !estimatedCount}
        variant="secondary"
        className="gap-2"
      >
        {bulkRescoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Re-score All Estimated ({estimatedCount})
      </Button>
      {editedCount > 0 && (
        <Button onClick={onBulkSaveAll} variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Approve All ({editedCount})
        </Button>
      )}
    </div>

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

    {bulkProgress && (
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground font-body">
          <span>Processing {bulkProgress.current + 1}/{bulkProgress.total}... {bulkProgress.currentName}</span>
        </div>
        <Progress value={((bulkProgress.current + 1) / bulkProgress.total) * 100} />
      </div>
    )}
  </>
);
