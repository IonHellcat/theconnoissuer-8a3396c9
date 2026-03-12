import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check, X, Star, ChevronUp } from "lucide-react";
import { statusBadge, pillarLabel, LOUNGE_PILLARS, SHOP_PILLARS } from "./scoreHelpers";
import type { LoungeRow, AnalysisResult } from "./scoreHelpers";

interface ScoreLoungeRowProps {
  lounge: LoungeRow;
  processing: boolean;
  expanded: boolean;
  editedResult: AnalysisResult | undefined;
  hasResult: boolean;
  onBootstrap: (lounge: LoungeRow) => void;
  onToggleExpand: (id: string) => void;
  onUpdatePillar: (loungeId: string, pillar: string, value: number | null) => void;
  onUpdateSummary: (loungeId: string, summary: string) => void;
  onSkip: (loungeId: string) => void;
  onSave: (lounge: LoungeRow) => void;
}

export const ScoreLoungeRow = ({
  lounge, processing, expanded, editedResult, hasResult,
  onBootstrap, onToggleExpand, onUpdatePillar, onUpdateSummary, onSkip, onSave,
}: ScoreLoungeRowProps) => (
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
      <div className="hidden md:block">{statusBadge(lounge.score_source)}</div>
      <div className="flex gap-1">
        {lounge.google_place_id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBootstrap(lounge)}
            disabled={processing || hasResult}
            className="gap-1 text-xs h-7"
          >
            {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Bootstrap
          </Button>
        )}
        {expanded && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleExpand(lounge.id)}
            className="h-7 w-7 p-0"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>

    {/* Expanded Result */}
    {expanded && editedResult && (
      <div className="border-t border-border/50 p-4 space-y-4 bg-secondary/30">
        {/* Reviews */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-2">
            Google Reviews ({editedResult.reviews.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {editedResult.reviews.map((r, i) => (
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

        {/* Pillar Scores */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-2">
            Pillar Scores
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(lounge.type === "shop" ? SHOP_PILLARS : LOUNGE_PILLARS).map((pillar) => (
              <div key={pillar}>
                <label className="text-[10px] text-muted-foreground font-body block mb-1">
                  {pillarLabel(pillar)}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={editedResult.pillar_scores[pillar] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : parseFloat(e.target.value);
                    onUpdatePillar(lounge.id, pillar, v);
                  }}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Score + Summary */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0 text-center">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center mx-auto">
              <span className="text-xl font-bold font-display text-foreground">
                {editedResult.connoisseur_score ?? "-"}
              </span>
            </div>
            {editedResult.score_label && (
              <span className="text-[10px] font-body text-primary mt-1 block">
                {editedResult.score_label}
              </span>
            )}
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground font-body block mb-1">Summary</label>
            <Textarea
              value={editedResult.score_summary || ""}
              onChange={(e) => onUpdateSummary(lounge.id, e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => onSkip(lounge.id)} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Skip
          </Button>
          <Button size="sm" onClick={() => onSave(lounge)} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Approve & Save
          </Button>
        </div>
      </div>
    )}
  </div>
);
