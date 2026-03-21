import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, X, Share2 } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TopFourShareModal from "@/components/TopFourShareModal";

interface TopLoungeRow {
  id: string;
  position: number;
  lounges: {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
    image_url_cached: string | null;
    cities: { name: string } | null;
  };
}

interface TopFourLoungesProps {
  userId: string;
  editable: boolean;
  displayName?: string;
  profileUrl?: string;
}

const TopFourLounges = ({ userId, editable, displayName, profileUrl }: TopFourLoungesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlot, setSearchSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  const { data: topLounges, refetch } = useQuery({
    queryKey: ["top-lounges", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("top_lounges" as any)
        .select("id, position, lounges(id, name, slug, image_url, image_url_cached, cities(name))")
        .eq("user_id", userId)
        .order("position");
      return (data || []) as unknown as TopLoungeRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: visitedLounges } = useQuery({
    queryKey: ["visited-lounges-top4", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("lounge_id, lounges(id, name, slug, image_url, image_url_cached, cities(name))")
        .eq("user_id", userId)
        .order("visited_at", { ascending: false });
      if (!data) return [];
      const seen = new Set();
      return data
        .map((v: any) => v.lounges)
        .filter((l: any) => {
          if (!l || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
    },
    enabled: editable && !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const filteredLounges = (visitedLounges || []).filter((l: any) =>
    searchQuery.length === 0 ||
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.cities?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const slots = [1, 2, 3, 4].map((pos) => ({
    position: pos,
    entry: topLounges?.find((t) => t.position === pos) || null,
  }));

  const handleSelect = async (loungeId: string) => {
    if (!searchSlot) return;
    const alreadyIn = topLounges?.some((t) => t.lounges.id === loungeId);
    if (alreadyIn) {
      toast({ title: "Already in your Top 4" });
      return;
    }
    await supabase.from("top_lounges" as any).upsert(
      { user_id: userId, lounge_id: loungeId, position: searchSlot },
      { onConflict: "user_id,position" }
    );
    refetch();
    queryClient.invalidateQueries({ queryKey: ["top-lounges", userId] });
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleRemove = async (rowId: string) => {
    await supabase.from("top_lounges" as any).delete().eq("id", rowId);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["top-lounges", userId] });
  };

  const hasAny = topLounges && topLounges.length > 0;
  if (!editable && !hasAny) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) => {
          const entry = slot.entry;
          if (entry) {
            return (
              <Link
                key={slot.position}
                to={`/lounge/${entry.lounges.slug}`}
                className="group relative aspect-square rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <OptimizedImage
                  src={entry.lounges.image_url_cached || entry.lounges.image_url || "/placeholder.svg"}
                  alt={entry.lounges.name}
                  width={320}
                  height={320}
                  sizes="(max-width: 640px) 50vw, 200px"
                  widths={[160, 320]}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-display text-sm font-bold text-white leading-tight line-clamp-2">
                    {entry.lounges.name}
                  </h3>
                  <p className="text-xs text-white/70 font-body mt-0.5">
                    {entry.lounges.cities?.name}
                  </p>
                </div>
                {editable && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(entry.id);
                    }}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            );
          }

          if (editable) {
            return (
              <button
                key={slot.position}
                onClick={() => {
                  setSearchSlot(slot.position);
                  setSearchOpen(true);
                }}
                className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs font-body">Add lounge</span>
              </button>
            );
          }

          return (
            <div
              key={slot.position}
              className="aspect-square rounded-xl border border-border/20 bg-secondary/30"
            />
          );
        })}
      </div>

      {editable && topLounges && topLounges.length > 0 && (
        <button
          onClick={() => setShareOpen(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share my Top 4
        </button>
      )}

      <Dialog open={searchOpen} onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) setSearchQuery("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add to Top 4</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Filter visited lounges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary border-border/50"
            autoFocus
          />
          {(visitedLounges || []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Check into lounges first to add them to your Top 4
              </p>
            </div>
          ) : filteredLounges.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body text-center py-4">
              No matching lounges
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredLounges.map((lounge: any) => {
                const alreadyIn = topLounges?.some((t) => t.lounges.id === lounge.id);
                return (
                  <button
                    key={lounge.id}
                    onClick={() => !alreadyIn && handleSelect(lounge.id)}
                    disabled={alreadyIn}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                      alreadyIn
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-secondary cursor-pointer"
                    )}
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    {(lounge.image_url_cached || lounge.image_url) ? (
                        <OptimizedImage
                          src={lounge.image_url_cached || lounge.image_url}
                          alt={lounge.name}
                          width={80}
                          height={80}
                          sizes="40px"
                          widths={[40, 80]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-display font-bold text-foreground truncate">
                        {lounge.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {lounge.cities?.name}
                      </p>
                    </div>
                    {alreadyIn && (
                      <span className="text-[10px] text-muted-foreground font-body shrink-0">
                        In Top 4
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {shareOpen && (
        <TopFourShareModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          displayName={displayName || "My"}
          lounges={slots
            .filter((s) => s.entry)
            .map((s) => ({
              name: s.entry!.lounges.name,
              cityName: s.entry!.lounges.cities?.name || "",
              image_url: s.entry!.lounges.image_url_cached || s.entry!.lounges.image_url,
            }))}
          profileUrl={profileUrl || `https://theconnoisseur.app/user/${userId}`}
        />
      )}
    </>
  );
};

export default TopFourLounges;
