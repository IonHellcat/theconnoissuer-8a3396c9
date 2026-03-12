import { useQuery } from "@tanstack/react-query";
import type { LoungeWithCity } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import FavoriteButton from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";

const FavoritesPage = () => {
  const { user, loading } = useAuth();
  const { favoriteIds } = useFavorites();

  const { data: lounges, isLoading } = useQuery({
    queryKey: ["favorite-lounges", favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lounges")
        .select("*, cities!inner(name, slug)")
        .in("id", favoriteIds);
      if (error) throw error;
      return data as unknown as LoungeWithCity[];
    },
    enabled: !!user && favoriteIds.length > 0,
  });

  if (!loading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Favorites — The Connoisseur</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="pt-16">
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">My Favorites</h1>
          </div>
          <p className="text-muted-foreground font-body mb-8">Lounges you want to visit</p>

          {isLoading || loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : !lounges || lounges.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body text-lg">No favorites yet</p>
              <Link to="/explore" className="text-primary text-sm mt-2 inline-block font-body hover:underline">
                Explore lounges
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lounges.map((lounge) => {
                const city = lounge.cities;
                return (
                  <Link
                    key={lounge.id}
                    to={`/lounge/${lounge.slug}`}
                    className="group block relative rounded-xl overflow-hidden aspect-[4/3] bg-secondary"
                  >
                    <OptimizedImage
                      src={lounge.image_url || "/placeholder.svg"}
                      alt={lounge.name}
                      width={480}
                      height={360}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      widths={[320, 480]}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton loungeId={lounge.id} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="font-display text-lg font-bold text-foreground">{lounge.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 font-body">{city?.name}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        <span className="text-xs font-medium font-body text-foreground">
                          {Number(lounge.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FavoritesPage;
