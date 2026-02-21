import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Save, Wand2, Check, X, Star, ChevronDown, ChevronUp } from "lucide-react";

interface LoungeRow {
  id: string;
  name: string;
  type: string;
  rating: number;
  review_count: number;
  google_place_id: string | null;
  connoisseur_score: number | null;
  score_source: string;
  score_label: string | null;
  city: { name: string; country: string } | null;
}

interface AnalysisResult {
  pillar_scores: Record<string, number | null>;
  connoisseur_score: number;
  score_label: string | null;
  score_summary: string;
  reviews: Array<{ author_name: string; rating: number | null; review_text: string; relative_time: string }>;
}

type SortKey = "name" | "city" | "rating" | "status";

const statusBadge = (source: string) => {
  switch (source) {
    case "estimated":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Estimated</span>;
    case "verified":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Verified</span>;
    case "no_reviews":
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No Reviews</span>;
    default:
      return <span className="text-[10px] font-medium font-body px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">No Score</span>;
  }
};

const LOUNGE_PILLARS = ["cigar_selection", "ambiance", "service", "drinks", "value"];
const SHOP_PILLARS = ["selection", "storage", "staff_knowledge", "pricing", "experience"];

const pillarLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const BootstrapScoresPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [editedResults, setEditedResults] = useState<Record<string, AnalysisResult>>({});
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [expandedLounges, setExpandedLounges] = useState<Record<string, boolean>>({});

  const { data: lounges, isLoading } = useQuery({
    queryKey: ["admin-lounges-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("id, name, type, rating, review_count, google_place_id, connoisseur_score, score_source, score_label, city:cities(name, country)")
        .order("name");
      if (error) throw error;
      return data as unknown as LoungeRow[];
    },
    enabled: !!isAdmin,
  });

  const stats = lounges
    ? {
        total: lounges.length,
        estimated: lounges.filter((l) => l.score_source === "estimated").length,
        verified: lounges.filter((l) => l.score_source === "verified").length,
        none: lounges.filter((l) => l.score_source === "none").length,
        withPlaceId: lounges.filter((l) => l.google_place_id && l.score_source === "none").length,
      }
    : null;

  const sortedLounges = lounges
    ? [...lounges].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "city":
            cmp = (a.city?.name || "").localeCompare(b.city?.name || "");
            break;
          case "rating":
            cmp = Number(b.rating) - Number(a.rating);
            break;
          case "status": {
            const order: Record<string, number> = { none: 0, estimated: 1, verified: 2 };
            cmp = (order[a.score_source] || 0) - (order[b.score_source] || 0);
            break;
          }
        }
        return sortAsc ? cmp : -cmp;
      })
    : [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <button
      onClick={() => toggleSort(sortField)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors font-body"
    >
      {label}
      {sortKey === sortField && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  const bootstrapSingle = async (lounge: LoungeRow): Promise<"success" | "no-reviews" | "error"> => {
    setProcessing((p) => ({ ...p, [lounge.id]: true }));
    try {
      // Refresh session to prevent token expiry during bulk operations
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn("Session refresh failed:", refreshError.message);
      }

      // Step 1: Fetch reviews
      const { data: reviewData, error: reviewError } = await supabase.functions.invoke("bootstrap-scores", {
        body: {
          action: "fetch-reviews",
          lounge_id: lounge.id,
          google_place_id: lounge.google_place_id,
        },
      });
      if (reviewError) throw reviewError;

      const reviews = reviewData?.reviews || [];
      if (reviews.length === 0) {
        // Mark as no_reviews so it's skipped in future bulk runs
        await supabase.functions.invoke("bootstrap-scores", {
          body: { action: "mark-no-reviews", lounge_id: lounge.id },
        });
        toast({ title: "No reviews", description: `${lounge.name} marked as no reviews — will be skipped next time.` });
        setProcessing((p) => ({ ...p, [lounge.id]: false }));
        queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
        return "no-reviews";
      }

      // Step 2: Analyze
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("bootstrap-scores", {
        body: {
          action: "analyze",
          lounge_name: lounge.name,
          lounge_type: lounge.type,
          city: lounge.city?.name || "Unknown",
          country: lounge.city?.country || "Unknown",
          reviews,
        },
      });
      if (analysisError) throw analysisError;

      // Handle AI refusal (returned as 200 with error key)
      if (analysisData?.error === "ai_refused") {
        toast({ title: "AI skipped", description: `${lounge.name}: AI could not analyze — may need manual scoring.` });
        setProcessing((p) => ({ ...p, [lounge.id]: false }));
        return "error";
      }

      const result: AnalysisResult = { ...analysisData, reviews };
      setResults((p) => ({ ...p, [lounge.id]: result }));
      setEditedResults((p) => ({ ...p, [lounge.id]: { ...result } }));
      setExpandedLounges((p) => ({ ...p, [lounge.id]: true }));
      return "success";
    } catch (e: any) {
      toast({ title: "Bootstrap failed", description: `${lounge.name}: ${e.message}`, variant: "destructive" });
      return "error";
    } finally {
      setProcessing((p) => ({ ...p, [lounge.id]: false }));
    }
  };

  const saveSingle = async (lounge: LoungeRow) => {
    const edited = editedResults[lounge.id];
    if (!edited) return;

    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-scores", {
        body: {
          action: "save",
          lounge_id: lounge.id,
          connoisseur_score: edited.connoisseur_score,
          score_label: edited.score_label,
          pillar_scores: edited.pillar_scores,
          score_summary: edited.score_summary,
        },
      });
      if (error) throw error;

      toast({ title: "Saved", description: `Score saved for ${lounge.name}` });
      setResults((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      setEditedResults((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      setExpandedLounges((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const skipSingle = (loungeId: string) => {
    setResults((p) => { const n = { ...p }; delete n[loungeId]; return n; });
    setEditedResults((p) => { const n = { ...p }; delete n[loungeId]; return n; });
    setExpandedLounges((p) => { const n = { ...p }; delete n[loungeId]; return n; });
  };

  const bulkBootstrap = async () => {
    if (!lounges) return;
    const batch = lounges
      .filter((l) => l.score_source === "none" && l.google_place_id)
      .slice(0, 50);

    if (batch.length === 0) {
      toast({ title: "Nothing to process", description: "All lounges with Google Place IDs already have scores." });
      return;
    }

    setBulkProgress({ current: 0, total: batch.length, currentName: "" });
    let successCount = 0;
    let noReviewCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batch.length; i++) {
      const lounge = batch[i];
      setBulkProgress({ current: i, total: batch.length, currentName: lounge.name });
      const result = await bootstrapSingle(lounge);
      if (result === "success") successCount++;
      else if (result === "no-reviews") noReviewCount++;
      else errorCount++;
      if (i < batch.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }

    setBulkProgress(null);
    toast({
      title: "Bulk bootstrap complete",
      description: `${successCount} scored, ${noReviewCount} no reviews, ${errorCount} errors.`,
    });
  };

  const bulkSaveAll = async () => {
    const entries = Object.entries(editedResults);
    let saved = 0;
    for (const [loungeId] of entries) {
      const lounge = lounges?.find((l) => l.id === loungeId);
      if (!lounge) continue;
      await saveSingle(lounge);
      saved++;
    }
    toast({ title: "Bulk save complete", description: `Saved ${saved} scores.` });
  };

  const updatePillar = (loungeId: string, pillar: string, value: number | null) => {
    setEditedResults((prev) => {
      const current = prev[loungeId];
      if (!current) return prev;
      const newPillars = { ...current.pillar_scores, [pillar]: value };
      const lounge = lounges?.find((l) => l.id === loungeId);
      const weights = lounge?.type === "shop"
        ? { selection: 0.25, storage: 0.30, staff_knowledge: 0.20, pricing: 0.15, experience: 0.10 }
        : { cigar_selection: 0.25, ambiance: 0.30, service: 0.20, drinks: 0.15, value: 0.10 };

      let totalWeight = 0;
      let weightedSum = 0;
      for (const [p, w] of Object.entries(weights)) {
        const s = newPillars[p];
        if (s !== null && s !== undefined) {
          totalWeight += w;
          weightedSum += (s / 5) * 100 * w;
        }
      }
      const newScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      const newLabel = newScore >= 93 ? "Legendary" : newScore >= 88 ? "Exceptional" : newScore >= 82 ? "Outstanding" : newScore >= 75 ? "Excellent" : newScore >= 65 ? "Good" : null;

      return {
        ...prev,
        [loungeId]: { ...current, pillar_scores: newPillars, connoisseur_score: newScore, score_label: newLabel },
      };
    });
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Bootstrap Connoisseur Scores</h1>
        <p className="text-muted-foreground font-body mb-8">
          Generate estimated scores by analyzing Google reviews with AI.
        </p>

        {/* Stats */}
        {stats && (
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
              <p className="text-2xl font-bold font-display text-primary">~${(stats.withPlaceId * 0.03).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground font-body">Est. Cost</p>
            </div>
          </div>
        )}

        {stats && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground font-body mb-1">
              <span>Score Coverage</span>
              <span>{Math.round(((stats.estimated + stats.verified) / stats.total) * 100)}%</span>
            </div>
            <Progress value={((stats.estimated + stats.verified) / stats.total) * 100} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button onClick={bulkBootstrap} disabled={!!bulkProgress || !lounges?.length} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Bulk Bootstrap (Top 50)
          </Button>
          {Object.keys(editedResults).length > 0 && (
            <Button onClick={bulkSaveAll} variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              Approve All ({Object.keys(editedResults).length})
            </Button>
          )}
        </div>

        {bulkProgress && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground font-body">
              <span>Processing {bulkProgress.current + 1}/{bulkProgress.total}... {bulkProgress.currentName}</span>
            </div>
            <Progress value={((bulkProgress.current + 1) / bulkProgress.total) * 100} />
          </div>
        )}

        {/* Lounge List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_80px_100px_120px] gap-3 px-4 py-2">
              <SortHeader label="Name" sortField="name" />
              <SortHeader label="City" sortField="city" />
              <SortHeader label="Rating" sortField="rating" />
              <SortHeader label="Status" sortField="status" />
              <span className="text-xs text-muted-foreground font-body">Action</span>
            </div>

            {sortedLounges.map((lounge) => (
              <div key={lounge.id} className="rounded-lg border border-border/50 bg-card overflow-hidden">
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
                        onClick={() => bootstrapSingle(lounge)}
                        disabled={processing[lounge.id] || !!results[lounge.id]}
                        className="gap-1 text-xs h-7"
                      >
                        {processing[lounge.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Bootstrap
                      </Button>
                    )}
                    {expandedLounges[lounge.id] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedLounges((p) => ({ ...p, [lounge.id]: !p[lounge.id] }))}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Result */}
                {expandedLounges[lounge.id] && editedResults[lounge.id] && (
                  <div className="border-t border-border/50 p-4 space-y-4 bg-secondary/30">
                    {/* Reviews */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wider mb-2">
                        Google Reviews ({editedResults[lounge.id].reviews.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {editedResults[lounge.id].reviews.map((r, i) => (
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
                              value={editedResults[lounge.id].pillar_scores[pillar] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value === "" ? null : parseFloat(e.target.value);
                                updatePillar(lounge.id, pillar, v);
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
                            {editedResults[lounge.id].connoisseur_score ?? "-"}
                          </span>
                        </div>
                        {editedResults[lounge.id].score_label && (
                          <span className="text-[10px] font-body text-primary mt-1 block">
                            {editedResults[lounge.id].score_label}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground font-body block mb-1">Summary</label>
                        <Textarea
                          value={editedResults[lounge.id].score_summary || ""}
                          onChange={(e) =>
                            setEditedResults((prev) => ({
                              ...prev,
                              [lounge.id]: { ...prev[lounge.id], score_summary: e.target.value },
                            }))
                          }
                          className="text-sm min-h-[60px]"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => skipSingle(lounge.id)} className="gap-1.5">
                        <X className="h-3.5 w-3.5" />
                        Skip
                      </Button>
                      <Button size="sm" onClick={() => saveSingle(lounge)} className="gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Approve & Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BootstrapScoresPage;
