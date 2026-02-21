import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Save, Wand2 } from "lucide-react";

const FEATURE_TAGS = [
  "Walk-in Humidor", "Outdoor Terrace", "Full Bar", "Food Menu",
  "Private Rooms", "Members Only", "Tourist Friendly", "Late Night",
  "Live Music", "Whiskey Selection", "Coffee Service", "Wi-Fi",
  "Parking", "Waterfront/View",
];

interface LoungeRow {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  type: string;
  google_place_id: string | null;
  review_count: number;
  city: { name: string; country: string } | null;
}

const GenerateFeaturesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: lounges, isLoading } = useQuery({
    queryKey: ["lounges-missing-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lounges")
        .select("id, name, address, description, type, google_place_id, review_count, city:cities(name, country)")
        .or("features.is.null,features.eq.{}")
        .order("review_count", { ascending: false });
      if (error) throw error;
      return data as unknown as LoungeRow[];
    },
    enabled: !!isAdmin,
  });

  const generateOne = async (lounge: LoungeRow) => {
    setGenerating((p) => ({ ...p, [lounge.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-lounge-features", {
        body: {
          lounge: {
            name: lounge.name,
            address: lounge.address,
            city: lounge.city?.name || "Unknown",
            description: lounge.description,
          },
        },
      });
      if (error) throw error;
      if (data?.features) {
        setDrafts((p) => ({ ...p, [lounge.id]: data.features }));
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating((p) => ({ ...p, [lounge.id]: false }));
    }
  };

  const toggleTag = (loungeId: string, tag: string) => {
    setDrafts((p) => {
      const current = p[loungeId] || [];
      return {
        ...p,
        [loungeId]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ lounge, features }: { lounge: LoungeRow; features: string[] }) => {
      const { error } = await supabase
        .from("lounges")
        .update({ features })
        .eq("id", lounge.id);
      if (error) throw error;

      if (lounge.google_place_id) {
        await supabase
          .from("pending_lounges")
          .update({ features })
          .eq("google_place_id", lounge.google_place_id);
      }
    },
    onSuccess: (_, { lounge }) => {
      setDrafts((p) => {
        const next = { ...p };
        delete next[lounge.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["lounges-missing-features"] });
      toast({ title: "Saved", description: "Features updated successfully." });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    },
  });

  const bulkGenerate = async () => {
    if (!lounges) return;
    const batch = lounges.slice(0, 50);
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
    for (const [id, features] of entries) {
      const lounge = lounges.find((l) => l.id === id);
      if (!lounge) continue;
      try {
        await saveMutation.mutateAsync({ lounge, features });
        saved++;
      } catch { /* handled by mutation */ }
    }
    toast({ title: "Bulk save complete", description: `Saved ${saved}/${entries.length} feature sets.` });
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
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Generate Features</h1>
            <p className="text-muted-foreground mt-1">
              {lounges ? `${lounges.length} lounges missing feature tags` : "Loading..."}
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
              Bulk Generate (Top 50)
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
            All lounges have feature tags! 🎉
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
                    {lounge.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {lounge.description}
                      </p>
                    )}
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
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {FEATURE_TAGS.map((tag) => (
                        <label
                          key={tag}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={drafts[lounge.id].includes(tag)}
                            onCheckedChange={() => toggleTag(lounge.id, tag)}
                          />
                          <span className="text-foreground">{tag}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          saveMutation.mutate({ lounge, features: drafts[lounge.id] })
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

export default GenerateFeaturesPage;
