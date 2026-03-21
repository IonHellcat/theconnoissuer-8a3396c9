import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function GuidesIndexPage() {
  const { data: isAdmin } = useAdminRole();
  const queryClient = useQueryClient();

  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("slug, title, meta_description, hero_subtitle, guide_type, country, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (slug: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("guides").delete().eq("slug", slug);
    if (error) {
      toast.error("Failed to delete guide");
      return;
    }
    toast.success("Guide deleted");
    queryClient.invalidateQueries({ queryKey: ["guides-index"] });
  };

  return (
    <>
      <Helmet>
        <title>Cigar Lounge Guides — Best Cigar Lounges by City & Country | The Connoisseur</title>
        <meta name="description" content="Expert guides to the world's best cigar lounges. Rankings, Connoisseur Scores, and insider tips for London, Dubai, New York, Miami, and 158 cities worldwide." />
        <link rel="canonical" href="https://theconnoisseur.app/guides" />
        <meta property="og:site_name" content="The Connoisseur" />
      </Helmet>

      <Navbar />

      <main className="pt-20 pb-24 md:pb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <header className="mb-10 space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Cigar Lounge Guides</h1>
            <p className="text-muted-foreground max-w-lg">
              In-depth guides to the world's best cigar lounges, by country and city.
            </p>
          </header>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : !guides?.length ? (
            <p className="text-muted-foreground">No guides published yet. Check back soon!</p>
          ) : (
            <div className="grid gap-4">
              {guides.map(g => (
                <div key={g.slug} className="relative group">
                  <Link to={`/guide/${g.slug}`}
                    className="bg-card border border-border/50 rounded-xl p-6 hover:border-primary/40 transition-colors space-y-3 block">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold tracking-[2px] uppercase text-primary border border-primary/40 rounded px-2 py-0.5">
                        {g.guide_type === "country" ? "Country Guide" : "City Guide"}
                      </span>
                      {g.country && (
                        <span className="text-xs text-muted-foreground">{g.country}</span>
                      )}
                    </div>
                    <h2 className="font-display text-lg font-bold leading-snug">{g.title}</h2>
                    {g.hero_subtitle && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{g.hero_subtitle}</p>
                    )}
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDelete(g.slug, g.title, e)}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                      title="Delete guide"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}