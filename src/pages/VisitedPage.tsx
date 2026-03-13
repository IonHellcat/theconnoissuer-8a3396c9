import { useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { MapPinCheck, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import WorldMapSvg from "@/components/WorldMapSvg";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "score" | "city";

const VisitedPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortKey>("recent");
  const [editingVisit, setEditingVisit] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: visits, isLoading } = useQuery({
    queryKey: ["visits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*, lounges(id, name, slug, image_url, connoisseur_score, score_label, score_source, rating, latitude, longitude, cities(name, country))")
        .eq("user_id", user!.id)
        .order("visited_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteVisit = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("visits").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      toast({ title: "Removed from passport" });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await supabase.from("visits").update({ note: note || null }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      setEditingVisit(null);
      toast({ title: "Note updated" });
    },
  });

  const sorted = useMemo(() => {
    if (!visits) return [];
    const arr = [...visits];
    switch (sort) {
      case "score":
        return arr.sort((a, b) => ((b.lounges as any)?.connoisseur_score ?? 0) - ((a.lounges as any)?.connoisseur_score ?? 0));
      case "city":
        return arr.sort((a, b) => ((a.lounges as any)?.cities?.name ?? "").localeCompare((b.lounges as any)?.cities?.name ?? ""));
      default:
        return arr;
    }
  }, [visits, sort]);

  // Stats
  const stats = useMemo(() => {
    if (!visits || visits.length === 0) return { count: 0, cities: 0, countries: 0, avgScore: null, topVisit: null };
    const citySet = new Set<string>();
    const countrySet = new Set<string>();
    let scoreSum = 0;
    let scoreCount = 0;
    let top: any = null;

    visits.forEach((v: any) => {
      const l = v.lounges;
      if (l?.cities?.name) citySet.add(l.cities.name);
      if (l?.cities?.country) countrySet.add(l.cities.country);
      if (l?.connoisseur_score) {
        scoreSum += l.connoisseur_score;
        scoreCount++;
        if (!top || l.connoisseur_score > top.score) {
          top = { name: l.name, score: l.connoisseur_score };
        }
      }
    });

    return {
      count: visits.length,
      cities: citySet.size,
      countries: countrySet.size,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      topVisit: top,
    };
  }, [visits]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Passport — The Connoisseur</title>
        <meta name="description" content="Your personal cigar passport. Track every lounge you visit around the world." />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-20 md:pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPinCheck className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl font-bold text-foreground">My Passport</h1>
            </div>
            {!isLoading && (
              <p className="text-muted-foreground font-body">
                {stats.count} {stats.count === 1 ? "lounge" : "lounges"} · {stats.cities} {stats.cities === 1 ? "city" : "cities"} · {stats.countries} {stats.countries === 1 ? "country" : "countries"}
              </p>
            )}
          </motion.div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-48 rounded-xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            </div>
          ) : visits && visits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <MapPinCheck className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                No visits yet
              </h2>
              <p className="text-muted-foreground font-body max-w-sm mx-auto mb-6">
                You haven't checked into any lounges yet. Visit a lounge page and tap "Been Here" to start your collection.
              </p>
              <Link to="/explore">
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Explore Lounges
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Lounges Visited", value: stats.count },
                  { label: "Cities", value: stats.cities },
                  { label: "Countries", value: stats.countries },
                  { label: "Avg Score", value: stats.avgScore ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-card rounded-xl border border-border/50 p-4 text-center">
                    <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {stats.topVisit && (
                <p className="text-sm text-muted-foreground font-body mb-6">
                  🏆 Top visit: <span className="text-foreground font-medium">{stats.topVisit.name}</span> ({stats.topVisit.score})
                </p>
              )}

              {/* Map Visualization */}
              <div className="bg-card rounded-xl border border-border/50 p-6 mb-8 relative overflow-hidden" style={{ minHeight: 240 }}>
                <p className="text-xs text-muted-foreground font-body mb-4">Your visited locations</p>
                <div className="relative w-full" style={{ height: 200 }}>
                  <WorldMapSvg className="absolute inset-0 w-full h-full text-muted-foreground opacity-15" />
                  {/* Visit dots */}
                  {visits!.map((v: any) => {
                    const lat = v.lounges?.latitude;
                    const lng = v.lounges?.longitude;
                    if (!lat || !lng) return null;
                    const x = ((Number(lng) + 180) / 360) * 100;
                    const y = ((90 - Number(lat)) / 180) * 100;
                    return (
                      <div
                        key={v.id}
                        className="absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                        style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
                        title={v.lounges?.name}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Sort + Grid */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground font-body">{sorted.length} lounges</p>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="score">Score (high)</SelectItem>
                    <SelectItem value="city">City A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sorted.map((v: any, i: number) => {
                  const l = v.lounges;
                  if (!l) return null;
                  return (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-card rounded-xl border border-border/50 overflow-hidden group"
                    >
                      <Link to={`/lounge/${l.slug}`} className="block">
                        <div className="aspect-[16/9] overflow-hidden">
                          <OptimizedImage
                            src={l.image_url || "/placeholder.svg"}
                            alt={l.name}
                            width={400}
                            height={225}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            widths={[200, 400]}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      </Link>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link to={`/lounge/${l.slug}`} className="font-display text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                              {l.name}
                            </Link>
                            <p className="text-xs text-muted-foreground font-body mt-0.5">
                              {l.cities?.name}, {l.cities?.country}
                            </p>
                          </div>
                          <ConnoisseurScoreBadge
                            score={l.connoisseur_score}
                            scoreLabel={l.score_label}
                            scoreSource={l.score_source}
                            googleRating={l.rating}
                            size="sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground font-body mt-2">
                          {format(new Date(v.visited_at), "MMM d, yyyy")}
                        </p>
                        {v.note && (
                          <p className="text-xs font-body italic text-muted-foreground mt-1 line-clamp-2">
                            {v.note}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              setEditingVisit(v);
                              setNoteText(v.note || "");
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Note
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => deleteVisit.mutate(v.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Edit Note Dialog */}
      <Dialog open={!!editingVisit} onOpenChange={(open) => !open && setEditingVisit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, 280))}
            placeholder="Add a personal note about your visit..."
            className="min-h-24"
          />
          <p className="text-xs text-muted-foreground text-right font-body">{noteText.length}/280</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVisit(null)}>Cancel</Button>
            <Button onClick={() => updateNote.mutate({ id: editingVisit.id, note: noteText })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitedPage;
