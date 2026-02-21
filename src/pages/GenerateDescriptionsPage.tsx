import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Save, Wand2 } from "lucide-react";

interface LoungeRow {
  id: string;
  name: string;
  address: string | null;
  rating: number;
  review_count: number;
  google_place_id: string | null;
  city: { name: string; country: string } | null;
}

const GenerateDescriptionsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: lounges, isLoading } = useQuery({
    queryKey: ["lounges-missing-descriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("id, name, address, rating, review_count, google_place_id, city:cities(name, country)")
        .or("description.is.null,description.eq.")
        .order("review_count", { ascending: false });
      if (error) throw error;
      return data as unknown as LoungeRow[];
    },
    enabled: !!isAdmin,
  });

  const generateOne = async (lounge: LoungeRow) => {
    setGenerating((p) => ({ ...p, [lounge.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-lounge-description", {
        body: {
          lounge: {
            name: lounge.name,
            address: lounge.address,
            city: lounge.city?.name || "Unknown",
            country: lounge.city?.country || "Unknown",
            rating: lounge.rating,
            review_count: lounge.review_count,
          },
        },
      });
      if (error) throw error;
      if (data?.description) {
        setDrafts((p) => ({ ...p, [lounge.id]: data.description }));
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating((p) => ({ ...p, [lounge.id]: false }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ lounge, description }: { lounge: LoungeRow; description: string }) => {
      const { error } = await supabase
        .from("lounges")
        .update({ description })
        .eq("id", lounge.id);
      if (error) throw error;

      // Also update pending_lounges if matching google_place_id
      if (lounge.google_place_id) {
        await supabase
          .from("pending_lounges")
          .update({ description })
          .eq("google_place_id", lounge.google_place_id);
      }
    },
    onSuccess: (_, { lounge }) => {
      setDrafts((p) => {
        const next = { ...p };
        delete next[lounge.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["lounges-missing-descriptions"] });
      toast({ title: "Saved", description: "Description updated successfully." });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const bulkGenerate = async () => {
    if (!lounges) return;
    const batch = lounges.slice(0, 100);
    setBulkProgress({ current: 0, total: batch.length });

    for (let i = 0; i < batch.length; i++) {
      const lounge = batch[i];
      if (drafts[lounge.id]) {
        setBulkProgress({ current: i + 1, total: batch.length });
        continue;
      }
      await generateOne(lounge);
      setBulkProgress({ current: i + 1, total: batch.length });
      if (i < batch.length - 1) await new Promise((r) => setTimeout(r, 500));
    }
    setBulkProgress(null);
    toast({ title: "Bulk generation complete", description: `Processed ${batch.length} lounges.` });
  };

  const bulkSaveAll = async () => {
    if (!lounges) return;
    const entries = Object.entries(drafts);
    let saved = 0;
    for (const [id, description] of entries) {
      const lounge = lounges.find((l) => l.id === id);
      if (!lounge) continue;
      try {
        await saveMutation.mutateAsync({ lounge, description });
        saved++;
      } catch {
        // individual error toasts handled by mutation
      }
    }
    toast({ title: "Bulk save complete", description: `Saved ${saved}/${entries.length} descriptions.` });
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
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8 max-w-5xl">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Generate Descriptions</h1>
            <p className="text-muted-foreground mt-1">
              {lounges ? `${lounges.length} lounges missing descriptions` : "Loading..."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={bulkSaveAll}
              disabled={saveMutation.isPending || Object.keys(drafts).length === 0}
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Bulk Save ({Object.keys(drafts).length})
            </Button>
            <Button
              onClick={bulkGenerate}
              disabled={!!bulkProgress || !lounges?.length}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Bulk Generate (Top 100)
            </Button>
          </div>
        </div>

        {bulkProgress && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing...</span>
              <span>{bulkProgress.current}/{bulkProgress.total}</span>
            </div>
            <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !lounges?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            All lounges have descriptions! 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {lounges.map((lounge) => (
              <div key={lounge.id} className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg truncate">{lounge.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {lounge.city?.name}, {lounge.city?.country}
                      {lounge.address && ` · ${lounge.address}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ⭐ {lounge.rating}/5 · {lounge.review_count} reviews
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateOne(lounge)}
                    disabled={generating[lounge.id]}
                    className="gap-1.5 shrink-0"
                  >
                    {generating[lounge.id] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate
                  </Button>
                </div>

                {drafts[lounge.id] && (
                  <div className="space-y-2">
                    <Textarea
                      value={drafts[lounge.id]}
                      onChange={(e) =>
                        setDrafts((p) => ({ ...p, [lounge.id]: e.target.value }))
                      }
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          saveMutation.mutate({ lounge, description: drafts[lounge.id] })
                        }
                        disabled={saveMutation.isPending}
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
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

export default GenerateDescriptionsPage;
