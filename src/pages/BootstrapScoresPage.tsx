import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { ScoreStats } from "@/components/admin/ScoreStats";
import { ScoreBulkActions } from "@/components/admin/ScoreBulkActions";
import { ScoreLoungeRow } from "@/components/admin/ScoreLoungeRow";
import type { LoungeRow, PipelineResult, SortKey } from "@/components/admin/scoreHelpers";

const BootstrapScoresPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, PipelineResult>>({});
  
  const [expandedLounges, setExpandedLounges] = useState<Record<string, boolean>>({});
  const [bulkRescoring, setBulkRescoring] = useState(false);
  const [bulkServerProgress, setBulkServerProgress] = useState<{ processed: number; total: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const { data: lounges, isLoading } = useQuery({
    queryKey: ["admin-lounges-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("id, name, type, rating, review_count, google_place_id, connoisseur_score, score_source, score_label, confidence, review_data_count, city:cities(name, country)")
        .order("name");
      if (error) throw error;
      return data as unknown as LoungeRow[];
    },
    enabled: !!isAdmin,
  });

  const stats = lounges ? {
    total: lounges.length,
    estimated: lounges.filter((l) => l.score_source === "estimated").length,
    verified: lounges.filter((l) => l.score_source === "verified").length,
    none: lounges.filter((l) => l.score_source === "none").length,
    noReviews: lounges.filter((l) => l.score_source === "no_reviews").length,
    withPlaceId: lounges.filter((l) => l.google_place_id && l.score_source === "none").length,
  } : null;

  const sortedLounges = lounges ? [...lounges].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "city": cmp = (a.city?.name || "").localeCompare(b.city?.name || ""); break;
      case "rating": cmp = Number(b.rating) - Number(a.rating); break;
      case "status": {
        const order: Record<string, number> = { none: 0, estimated: 1, verified: 2 };
        cmp = (order[a.score_source] || 0) - (order[b.score_source] || 0);
        break;
      }
    }
    return sortAsc ? cmp : -cmp;
  }) : [];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <button onClick={() => toggleSort(sortField)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors font-body">
      {label}
      {sortKey === sortField && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  // Full pipeline: fetch-reviews → classify → compute-scores → summarize
  const bootstrapSingle = async (lounge: LoungeRow): Promise<"success" | "no-reviews" | "error"> => {
    setProcessing((p) => ({ ...p, [lounge.id]: true }));
    try {
      // 1. Fetch reviews
      const { data: reviewData, error: reviewError } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "fetch-reviews", lounge_id: lounge.id, google_place_id: lounge.google_place_id },
      });
      if (reviewError) throw reviewError;
      const reviews = reviewData?.reviews || [];
      if (reviews.length === 0) {
        await supabase.functions.invoke("bootstrap-scores", { body: { action: "mark-no-reviews", lounge_id: lounge.id } });
        toast({ title: "No reviews", description: `${lounge.name} marked as no reviews.` });
        setProcessing((p) => ({ ...p, [lounge.id]: false }));
        queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
        return "no-reviews";
      }

      // 2. Classify
      const { data: classifyData, error: classifyError } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "classify", lounge_id: lounge.id, venue_type: lounge.type },
      });
      if (classifyError) throw classifyError;

      // 3. Compute scores
      const { data: scoreData, error: scoreError } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "compute-scores", lounge_id: lounge.id },
      });
      if (scoreError) throw scoreError;

      // 4. Summarize
      const { data: summaryData } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "summarize", lounge_id: lounge.id },
      });

      const result: PipelineResult = {
        connoisseur_score: scoreData.connoisseur_score,
        score_label: scoreData.score_label,
        pillar_scores: scoreData.pillar_scores,
        confidence: scoreData.confidence,
        components: scoreData.components,
        score_summary: summaryData?.summary || "",
        reviews,
      };

      setResults((p) => ({ ...p, [lounge.id]: result }));
      setExpandedLounges((p) => ({ ...p, [lounge.id]: true }));
      return "success";
    } catch (e: any) {
      toast({ title: "Pipeline failed", description: `${lounge.name}: ${e.message}`, variant: "destructive" });
      return "error";
    } finally {
      setProcessing((p) => ({ ...p, [lounge.id]: false }));
    }
  };

  const saveSingle = async (lounge: LoungeRow) => {
    const result = results[lounge.id];
    if (!result) return;
    try {
      const { error } = await supabase.functions.invoke("bootstrap-scores", {
        body: {
          action: "save", lounge_id: lounge.id,
          connoisseur_score: result.connoisseur_score, score_label: result.score_label,
          pillar_scores: result.pillar_scores, score_summary: result.score_summary,
        },
      });
      if (error) throw error;
      toast({ title: "Saved", description: `Score saved for ${lounge.name}` });
      setResults((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      setExpandedLounges((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const skipSingle = (loungeId: string) => {
    setResults((p) => { const n = { ...p }; delete n[loungeId]; return n; });
    setExpandedLounges((p) => { const n = { ...p }; delete n[loungeId]; return n; });
  };

  const deleteSingle = async (lounge: LoungeRow) => {
    try {
      // 1. Record in deleted_lounges blocklist
      await supabase.from("deleted_lounges").insert({
        google_place_id: lounge.google_place_id,
        name: lounge.name,
        city_name: lounge.city?.name || null,
      });

      // 2. Clean up related data
      await supabase.from("review_classifications").delete().eq("lounge_id", lounge.id);
      await supabase.from("google_reviews").delete().eq("lounge_id", lounge.id);
      await supabase.from("favorites").delete().eq("lounge_id", lounge.id);
      await supabase.from("reviews").delete().eq("lounge_id", lounge.id);

      // 3. Delete the lounge
      const { error } = await supabase.from("lounges").delete().eq("id", lounge.id);
      if (error) throw error;

      // 4. Update city lounge count
      if (lounge.city) {
        const { count } = await supabase
          .from("lounges")
          .select("id", { count: "exact", head: true })
          .eq("city_id", (lounge as any).city_id || "");
        // Best effort - don't fail if this doesn't work
      }

      toast({ title: "Deleted", description: `${lounge.name} permanently deleted and blocklisted.` });
      setResults((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      setExpandedLounges((p) => { const n = { ...p }; delete n[lounge.id]; return n; });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const [bulkBootstrapping, setBulkBootstrapping] = useState(false);
  const [bulkBootstrapProgress, setBulkBootstrapProgress] = useState<{
    scored: number; no_reviews: number; errors: number; remaining: number; total: number;
  } | null>(null);

  const bulkBootstrap = async () => {
    if (!lounges) return;
    setBulkBootstrapping(true);
    setBulkBootstrapProgress(null);
    try {
      toast({ title: "Bulk pipeline started", description: "Fetching reviews → classifying → scoring → summarizing..." });
      let totalScored = 0, totalNoReviews = 0, totalErrors = 0;
      const chunkSize = 10; // Process 10 venues per chunk with 3 concurrent

      while (true) {
        // Check for pause
        while (pausedRef.current) {
          await new Promise(r => setTimeout(r, 300));
        }

        // Refresh session to prevent token expiry during long operations
        await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke("bootstrap-scores", {
          body: { action: "bulk-full-pipeline-chunk", limit: chunkSize, concurrency: 3 },
        });
        if (error) throw error;

        totalScored += data?.scored ?? 0;
        totalNoReviews += data?.no_reviews ?? 0;
        totalErrors += data?.errors ?? 0;
        const remaining = data?.remaining ?? 0;
        const total = data?.total ?? (totalScored + totalNoReviews + totalErrors + remaining);

        setBulkBootstrapProgress({
          scored: totalScored, no_reviews: totalNoReviews, errors: totalErrors,
          remaining, total,
        });

        if (data?.done || remaining <= 0) break;

        // Refresh table data periodically
        if ((totalScored + totalNoReviews + totalErrors) % 30 === 0) {
          queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
        }

        // Minimal delay between chunks
        await new Promise(r => setTimeout(r, 100));
      }

      toast({
        title: "Bulk pipeline complete",
        description: `${totalScored} scored, ${totalNoReviews} no reviews, ${totalErrors} errors.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Bulk pipeline failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkBootstrapping(false);
      setBulkBootstrapProgress(null);
    }
  };

  const bulkRescoreServer = async () => {
    setBulkRescoring(true);
    setBulkServerProgress(null);
    try {
      toast({ title: "Bulk pipeline started", description: "Processing venues with classify → compute → summarize..." });
      let offset = 0;
      const limit = 10;
      let scored = 0, skipped = 0, errors = 0, total = stats?.estimated || 0;
      while (true) {
        while (pausedRef.current) {
          await new Promise(r => setTimeout(r, 300));
        }
        await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("bootstrap-scores", {
          body: { action: "bulk-pipeline-chunk", offset, limit },
        });
        if (error) throw error;
        scored += data?.scored ?? 0; skipped += data?.skipped ?? 0; errors += data?.errors ?? 0;
        total = data?.total ?? total;
        const nextOffset = data?.next_offset ?? offset;
        setBulkServerProgress({ processed: Math.min(nextOffset, total), total });
        if (data?.done || nextOffset <= offset) break;
        offset = nextOffset;
      }
      toast({ title: "Bulk pipeline complete", description: `${scored} scored, ${skipped} skipped, ${errors} errors out of ${total}.` });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Bulk pipeline failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkRescoring(false);
      setBulkServerProgress(null);
    }
  };

  const [bulkRecalculating, setBulkRecalculating] = useState(false);
  const [bulkRecalcProgress, setBulkRecalcProgress] = useState<{ processed: number; total: number } | null>(null);

  const bulkRecalculate = async () => {
    setBulkRecalculating(true);
    setBulkRecalcProgress(null);
    try {
      toast({ title: "Recalculation started", description: "Recomputing scores from existing data (no AI calls)..." });
      let offset = 0;
      const limit = 50;
      let totalRecalculated = 0, totalSkipped = 0, total = 0;
      while (true) {
        while (pausedRef.current) {
          await new Promise(r => setTimeout(r, 300));
        }
        await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("bootstrap-scores", {
          body: { action: "recalculate-scores-chunk", offset, limit },
        });
        if (error) throw error;
        totalRecalculated += data?.recalculated ?? 0;
        totalSkipped += data?.skipped ?? 0;
        total = data?.total ?? total;
        const nextOffset = data?.next_offset ?? offset;
        setBulkRecalcProgress({ processed: Math.min(nextOffset, total), total });
        if (data?.done || nextOffset <= offset) break;
        offset = nextOffset;
      }
      toast({ title: "Recalculation complete", description: `${totalRecalculated} recalculated, ${totalSkipped} skipped out of ${total}.` });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Recalculation failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkRecalculating(false);
      setBulkRecalcProgress(null);
    }
  };

  const bulkSaveAll = async () => {
    const entries = Object.entries(results);
    let saved = 0;
    for (const [loungeId] of entries) {
      const lounge = lounges?.find((l) => l.id === loungeId);
      if (!lounge) continue;
      await saveSingle(lounge);
      saved++;
    }
    toast({ title: "Bulk save complete", description: `Saved ${saved} scores.` });
  };

  const [resettingScores, setResettingScores] = useState(false);
  const resetAllScores = async () => {
    setResettingScores(true);
    try {
      const { error } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "reset-all" },
      });
      if (error) throw error;
      toast({ title: "Reset complete", description: "All scores, classifications, and summaries have been cleared." });
      setResults({});
      setExpandedLounges({});
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    } finally {
      setResettingScores(false);
    }
  };

  if (authLoading || roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Connoisseur Score Pipeline</h1>
        <p className="text-muted-foreground font-body mb-8">
          Deterministic scoring: classify review sentiments → compute weighted score → generate summary.
        </p>

        {stats && <ScoreStats stats={stats} />}

        <ScoreBulkActions
          bulkBootstrapping={bulkBootstrapping} bulkBootstrapProgress={bulkBootstrapProgress}
          bulkRescoring={bulkRescoring} bulkServerProgress={bulkServerProgress}
          bulkRecalculating={bulkRecalculating} bulkRecalcProgress={bulkRecalcProgress}
          unscoredCount={stats?.none || 0} estimatedCount={stats?.estimated || 0}
          editedCount={Object.keys(results).length} loungeCount={lounges?.length || 0}
          onBulkBootstrap={bulkBootstrap} onBulkRescore={bulkRescoreServer}
          onBulkRecalculate={bulkRecalculate} onBulkSaveAll={bulkSaveAll}
          onResetAllScores={resetAllScores} resetting={resettingScores}
          paused={paused} onTogglePause={() => { setPaused(p => !p); pausedRef.current = !pausedRef.current; }}
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-[1fr_120px_80px_100px_120px] gap-3 px-4 py-2">
              <SortHeader label="Name" sortField="name" />
              <SortHeader label="City" sortField="city" />
              <SortHeader label="Rating" sortField="rating" />
              <SortHeader label="Status" sortField="status" />
              <span className="text-xs text-muted-foreground font-body">Action</span>
            </div>
            {sortedLounges.map((lounge) => (
              <ScoreLoungeRow
                key={lounge.id}
                lounge={lounge}
                processing={!!processing[lounge.id]}
                expanded={!!expandedLounges[lounge.id]}
                result={results[lounge.id]}
                hasResult={!!results[lounge.id]}
                onBootstrap={bootstrapSingle}
                onToggleExpand={(id) => setExpandedLounges((p) => ({ ...p, [id]: !p[id] }))}
                onSkip={skipSingle}
                onSave={saveSingle}
                onDelete={deleteSingle}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BootstrapScoresPage;
