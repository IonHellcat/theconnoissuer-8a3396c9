import { useSearchParams, Link } from "react-router-dom";
import type { LoungeWithCity } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Search, MapPin, ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CityCard from "@/components/CityCard";
import OptimizedImage from "@/components/OptimizedImage";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import SearchFilters, {
  type SearchFilterValues,
  type SortOption,
} from "@/components/SearchFilters";

const priceTierLabel = (tier: number) => "$".repeat(tier);

const DEFAULT_FILTERS: SearchFilterValues = {
  venueTypes: [],
  priceTiers: [],
  ratingRange: [0, 5],
  features: [],
  sort: "relevance",
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [localQuery, setLocalQuery] = useState(q);
  const [filters, setFilters] = useState<SearchFilterValues>(DEFAULT_FILTERS);

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ["search-cities", q],
    queryFn: async () => {
      if (!q) return [];
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .or(`name.ilike.%${q}%,country.ilike.%${q}%`)
        .order("lounge_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!q,
  });

  const { data: rawLounges, isLoading: loungesLoading } = useQuery({
    queryKey: ["search-lounges", q],
    queryFn: async () => {
      if (!q) return [];
      const { data, error } = await supabase
        .from("lounges")
        .select("*, cities!inner(name, slug)")
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%`)
        .order("rating", { ascending: false });
      if (error) throw error;
      return data as unknown as LoungeWithCity[];
    },
    enabled: !!q,
  });

  // Apply client-side filters and sorting
  const lounges = useMemo(() => {
    if (!rawLounges) return [];

    let filtered = rawLounges.filter((l) => {
      if (filters.venueTypes.length > 0 && !filters.venueTypes.includes(l.type))
        return false;
      if (filters.priceTiers.length > 0 && !filters.priceTiers.includes(l.price_tier))
        return false;
      const r = Number(l.rating);
      if (r < filters.ratingRange[0] || r > filters.ratingRange[1])
        return false;
      if (filters.features.length > 0) {
        const loungeFeatures = (l.features || []).map((f: string) =>
          f.toLowerCase()
        );
        const hasAll = filters.features.every((f) =>
          loungeFeatures.some(
            (lf: string) => lf.includes(f.toLowerCase()) || f.toLowerCase().includes(lf)
          )
        );
        if (!hasAll) return false;
      }
      return true;
    });

    // Sort
    const sortFns: Record<SortOption, (a: typeof filtered[0], b: typeof filtered[0]) => number> = {
      relevance: () => 0,
      rating_desc: (a, b) => Number(b.rating) - Number(a.rating),
      rating_asc: (a, b) => Number(a.rating) - Number(b.rating),
      score_desc: (a, b) => ((b as any).connoisseur_score ?? 0) - ((a as any).connoisseur_score ?? 0),
      price_asc: (a, b) => a.price_tier - b.price_tier,
      price_desc: (a, b) => b.price_tier - a.price_tier,
      name_asc: (a, b) => a.name.localeCompare(b.name),
    };

    if (filters.sort !== "relevance") {
      filtered = [...filtered].sort(sortFns[filters.sort]);
    }

    return filtered;
  }, [rawLounges, filters]);

  const isLoading = citiesLoading || loungesLoading;
  const hasResults = (cities && cities.length > 0) || lounges.length > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchParams({ q: localQuery.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{q ? `"${q}" — Search — The Connoisseur` : "Search — The Connoisseur"}</title>
        <meta name="description" content={q ? `Search results for "${q}" on The Connoisseur.` : "Search cigar lounges and shops worldwide on The Connoisseur."} />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back + Search bar */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>

          <form onSubmit={handleSearch} className="max-w-2xl mb-8">
            <div className="relative flex items-center bg-secondary rounded-lg border border-border/50">
              <Search className="ml-4 h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="Search by city, country, or lounge name..."
                className="flex-1 bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-base font-body"
              />
              <button
                type="submit"
                className="mr-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {q && (
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6"
            >
              Results for "<span className="text-primary">{q}</span>"
            </motion.h1>
          )}

          {/* Filters + Results layout */}
          <div className="flex gap-8">
            {q && (
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                resultCount={lounges.length}
              />
            )}

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : !q ? (
                <div className="text-center py-20">
                  <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-body">
                    Enter a search term to find cigar lounges
                  </p>
                </div>
              ) : !hasResults ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground font-body text-lg">
                    No results found for "{q}"
                  </p>
                  <p className="text-muted-foreground/60 font-body text-sm mt-2">
                    Try searching for a city, country, or lounge name
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {/* City results */}
                  {cities && cities.length > 0 && (
                    <section>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-5">
                        Cities ({cities.length})
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                        {cities.map((city, index) => (
                          <CityCard
                            key={city.id}
                            name={city.name}
                            country={city.country}
                            loungeCount={city.lounge_count}
                            imageUrl={city.image_url || "/placeholder.svg"}
                            slug={city.slug}
                            index={index}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Lounge results */}
                  {lounges.length > 0 && (
                    <section>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-5">
                        Lounges ({lounges.length})
                      </h2>
                      <div className="space-y-4">
                        {lounges.map((lounge, index) => (
                          <motion.div
                            key={lounge.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Link
                              to={`/lounge/${lounge.slug}`}
                              className="group block bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row">
                                <div className="sm:w-56 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
                                  <OptimizedImage
                                    src={lounge.image_url || "/placeholder.svg"}
                                    alt={lounge.name}
                                    width={448}
                                    height={320}
                                    sizes="(max-width: 640px) 100vw, 224px"
                                    widths={[320, 448]}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                </div>
                                <div className="flex-1 p-4 sm:p-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                          {lounge.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-body">
                                          {priceTierLabel(lounge.price_tier)}
                                        </span>
                                      </div>
                                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                        {lounge.name}
                                      </h3>
                                      {lounge.score_summary && (
                                        <p className="text-xs font-body italic text-muted-foreground line-clamp-1 mt-0.5">
                                          {lounge.score_summary}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                                        {lounge.cities?.name}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <ConnoisseurScoreBadge
                                        score={lounge.connoisseur_score}
                                        scoreLabel={lounge.score_label}
                                        scoreSource={lounge.score_source || "none"}
                                        googleRating={Number(lounge.rating)}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                  {lounge.address && (
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="font-body">{lounge.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchPage;
