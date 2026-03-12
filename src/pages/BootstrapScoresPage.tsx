import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { ScoreStats } from "@/components/admin/ScoreStats";
import { ScoreBulkActions } from "@/components/admin/ScoreBulkActions";
import { ScoreLoungeRow } from "@/components/admin/ScoreLoungeRow";
import type { LoungeRow, AnalysisResult, SortKey } from "@/components/admin/scoreHelpers";

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
  const [bulkRescoring, setBulkRescoring] = useState(false);
  const [bulkServerProgress, setBulkServerProgress] = useState<{ processed: number; total: number } | null>(null);

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

  const bootstrapSingle = async (lounge: LoungeRow): Promise<"success" | "no-reviews" | "error"> => {
    setProcessing((p) => ({ ...p, [lounge.id]: true }));
    try {
      const { data: reviewData, error: reviewError } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "fetch-reviews", lounge_id: lounge.id, google_place_id: lounge.google_place_id },
      });
      if (reviewError) throw reviewError;
      const reviews = reviewData?.reviews || [];
      if (reviews.length === 0) {
        await supabase.functions.invoke("bootstrap-scores", { body: { action: "mark-no-reviews", lounge_id: lounge.id } });
        toast({ title: "No reviews", description: `${lounge.name} marked as no reviews — will be skipped next time.` });
        setProcessing((p) => ({ ...p, [lounge.id]: false }));
        queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
        return "no-reviews";
      }
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "analyze", lounge_name: lounge.name, lounge_type: lounge.type, city: lounge.city?.name || "Unknown", country: lounge.city?.country || "Unknown", reviews },
      });
      if (analysisError) throw analysisError;
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
      const { error } = await supabase.functions.invoke("bootstrap-scores", {
        body: { action: "save", lounge_id: lounge.id, connoisseur_score: edited.connoisseur_score, score_label: edited.score_label, pillar_scores: edited.pillar_scores, score_summary: edited.score_summary },
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

  const runBulkBatch = async (batch: LoungeRow[], label: string) => {
    if (batch.length === 0) { toast({ title: "Nothing to process", description: `No ${label} lounges to bootstrap.` }); return; }
    setBulkProgress({ current: 0, total: batch.length, currentName: "" });
    let successCount = 0, noReviewCount = 0, errorCount = 0;
    for (let i = 0; i < batch.length; i++) {
      setBulkProgress({ current: i, total: batch.length, currentName: batch[i].name });
      const result = await bootstrapSingle(batch[i]);
      if (result === "success") successCount++; else if (result === "no-reviews") noReviewCount++; else errorCount++;
      if (i < batch.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }
    setBulkProgress(null);
    toast({ title: `${label} complete`, description: `${successCount} scored, ${noReviewCount} no reviews, ${errorCount} errors.` });
  };

  const bulkBootstrap = async () => {
    if (!lounges) return;
    await runBulkBatch(lounges.filter((l) => l.score_source === "none" && l.google_place_id).slice(0, 50), "Bulk bootstrap");
  };

  const bulkRescoreServer = async () => {
    setBulkRescoring(true);
    setBulkServerProgress(null);
    try {
      toast({ title: "Bulk rescore started", description: "Processing estimated venues in server-side chunks..." });
      let offset = 0;
      const limit = 15;
      let rescored = 0, skipped = 0, errors = 0, total = stats?.estimated || 0;
      while (true) {
        const { data, error } = await supabase.functions.invoke("bootstrap-scores", { body: { action: "bulk-rescore-chunk", offset, limit } });
        if (error) throw error;
        rescored += data?.rescored ?? 0; skipped += data?.skipped ?? 0; errors += data?.errors ?? 0; total = data?.total ?? total;
        const nextOffset = data?.next_offset ?? offset;
        setBulkServerProgress({ processed: Math.min(nextOffset, total), total });
        if (data?.done || nextOffset <= offset) break;
        offset = nextOffset;
      }
      toast({ title: "Bulk rescore complete", description: `${rescored} rescored, ${skipped} skipped (no cached reviews), ${errors} errors out of ${total} total.` });
      queryClient.invalidateQueries({ queryKey: ["admin-lounges-scores"] });
    } catch (e: any) {
      toast({ title: "Bulk rescore failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkRescoring(false);
      setBulkServerProgress(null);
    }
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
      let totalWeight = 0, weightedSum = 0;
      for (const [p, w] of Object.entries(weights)) {
        const s = newPillars[p];
        if (s !== null && s !== undefined) { totalWeight += w; weightedSum += (s / 5) * 100 * w; }
      }
      const newScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      const newLabel = newScore >= 93 ? "Legendary" : newScore >= 88 ? "Exceptional" : newScore >= 82 ? "Outstanding" : newScore >= 75 ? "Excellent" : newScore >= 65 ? "Good" : null;
      return { ...prev, [loungeId]: { ...current, pillar_scores: newPillars, connoisseur_score: newScore, score_label: newLabel } };
    });
  };

  if (authLoading || roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 max-w-6xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Bootstrap Connoisseur Scores</h1>
        <p className="text-muted-foreground font-body mb-8">Generate estimated scores by analyzing Google reviews with AI.</p>

        {stats && <ScoreStats stats={stats} />}

        <ScoreBulkActions
          bulkProgress={bulkProgress} bulkRescoring={bulkRescoring} bulkServerProgress={bulkServerProgress}
          estimatedCount={stats?.estimated || 0} editedCount={Object.keys(editedResults).length} loungeCount={lounges?.length || 0}
          onBulkBootstrap={bulkBootstrap} onBulkRescore={bulkRescoreServer} onBulkSaveAll={bulkSaveAll}
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
                editedResult={editedResults[lounge.id]}
                hasResult={!!results[lounge.id]}
                onBootstrap={bootstrapSingle}
                onToggleExpand={(id) => setExpandedLounges((p) => ({ ...p, [id]: !p[id] }))}
                onUpdatePillar={updatePillar}
                onUpdateSummary={(id, summary) => setEditedResults((prev) => ({ ...prev, [id]: { ...prev[id], score_summary: summary } }))}
                onSkip={skipSingle}
                onSave={saveSingle}
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
