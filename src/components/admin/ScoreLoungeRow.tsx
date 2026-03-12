import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ChevronUp, Trash2 } from "lucide-react";
import {
  statusBadge, confidenceBadge, aspectLabel, sentimentColor, sentimentLabel,
  LOUNGE_ASPECTS, SHOP_ASPECTS,
} from "./scoreHelpers";
import type { LoungeRow, PipelineResult } from "./scoreHelpers";
import { Star } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScoreLoungeRowProps {
  lounge: LoungeRow;
  processing: boolean;
  expanded: boolean;
  result: PipelineResult | undefined;
  hasResult: boolean;
  onBootstrap: (lounge: LoungeRow) => void;
  onToggleExpand: (id: string) => void;
  onSave: (lounge: LoungeRow) => void;
  onSkip: (loungeId: string) => void;
  onDelete: (lounge: LoungeRow) => void;
}

export const ScoreLoungeRow = ({
  lounge, processing, expanded, result, hasResult,
  onBootstrap, onToggleExpand, onSave, onSkip, onDelete,
}: ScoreLoungeRowProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const aspects = lounge.type === "shop" ? SHOP_ASPECTS : LOUNGE_ASPECTS;

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      {/* Row */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_80px_100px_120px] gap-2 md:gap-3 px-4 py-3 items-center">
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{lounge.name}</p>
          <p className="text-xs text-muted-foreground font-body md:hidden">
            {lounge.city?.name} · {Number(lounge.rating).toFixed(1)}★
          </p>
        </div>
        <span className="hidden md:block text-xs text-muted-foreground font-body truncate">{lounge.city?.name}</span>
        <div className="hidden md:flex items-center gap-1">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs font-body">{Number(lounge.rating).toFixed(1)}</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {statusBadge(lounge.score_source)}
          {confidenceBadge(lounge.confidence)}
        </div>
        <div className="flex gap-1">
          {lounge.google_place_id && (
            <Button
              size="sm" variant="outline"
              onClick={() => onBootstrap(lounge)}
              disabled={processing || hasResult}
              className="gap-1 text-xs h-7"
            >
              {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Score
            </Button>
          )}
          {expanded && (
            <Button size="sm" variant="ghost" onClick={() => onToggleExpand(lounge.id)} className="h-7 w-7 p-0">
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Result */}
      {expanded && result && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-secondary/30">
          {/* Reviews */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-2">
              Google Reviews ({result.reviews.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.reviews.map((r, i) => (
                <div key={i} className="bg-card rounded-md p-3 text-xs font-body">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{r.author_name}</span>
                    {r.rating && <span className="text-primary">{r.rating}★</span>}
                    <span className="text-muted-foreground">{r.relative_time}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{r.review_text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Aspect Sentiments */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-2">
              Aspect Analysis
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {aspects.map((aspect) => {
                const data = result.pillar_scores[aspect];
                return (
                  <div key={aspect} className="bg-card rounded-md p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">
                      {aspectLabel(aspect)}
                    </p>
                    <p className={`text-sm font-bold font-display ${sentimentColor(data?.sentiment || "not_mentioned")}`}>
                      {sentimentLabel(data?.sentiment || "not_mentioned")}
                    </p>
                    {data && data.total > 0 && (
                      <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                        {data.positive}↑ {data.negative}↓ / {data.total}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Components */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0 text-center">
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center mx-auto">
                <span className="text-xl font-bold font-display text-foreground">
                  {result.connoisseur_score ?? "-"}
                </span>
              </div>
              {result.score_label && (
                <span className="text-[10px] font-body text-primary mt-1 block">{result.score_label}</span>
              )}
              {confidenceBadge(result.confidence)}
            </div>
            <div className="flex-1 space-y-2">
              {result.components && (
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: "Quality", value: result.components.quality, weight: "30%" },
                    { label: "Sentiment", value: result.components.sentiment, weight: "25%" },
                    { label: "Volume", value: result.components.volume, weight: "20%" },
                    { label: "Prestige", value: result.components.prestige, weight: "15%" },
                    { label: "Consistency", value: result.components.consistency, weight: "10%" },
                  ].map((c) => (
                    <div key={c.label} className="bg-card rounded-md p-2">
                      <p className="text-[9px] text-muted-foreground font-body uppercase">{c.label} ({c.weight})</p>
                      <p className="text-sm font-bold font-display text-foreground">{Math.round(c.value)}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.score_summary && (
                <p className="text-xs font-body italic text-muted-foreground">{result.score_summary}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => onSkip(lounge.id)} className="gap-1.5">
              Skip
            </Button>
            <Button size="sm" onClick={() => onSave(lounge)} className="gap-1.5">
              Approve & Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
