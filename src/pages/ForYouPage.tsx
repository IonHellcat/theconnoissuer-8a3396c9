import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { VisitType, VenueType, RecommendedLounge } from "@/lib/recommendations";
import { ResultsList } from "@/components/for-you/ResultsList";
import { PillToggle } from "@/components/for-you/PillToggle";
import { Sparkles, MapPin, ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CityOption {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
}

const ForYouPage = () => {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [visitType, setVisitType] = useState<VisitType | "Any">("Any");
  const [venueType, setVenueType] = useState<VenueType>("All");
  const [showVisitStyle, setShowVisitStyle] = useState(false);

  // Auto-attempt geolocation on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationLabel("Current Location");
        setGeoLoading(false);
        setGeoAttempted(true);
      },
      () => {
        setGeoLoading(false);
        setGeoAttempted(true);
      },
      { timeout: 5000 },
    );
  }, []);

  const selectCity = (city: CityOption) => {
    setUserLat(city.lat); setUserLng(city.lng); setLocationLabel(city.city_name);
    setShowCityDropdown(false); setCityQuery(city.city_name);
  };

  const changeLocation = () => {
    setUserLat(null); setUserLng(null); setLocationLabel(""); setCityQuery("");
  };

  const effectiveVisitType: VisitType = visitType === "Any" ? "Full Evening" : visitType;

  const { data: results, isLoading: finding } = useQuery({
    queryKey: ["for-you-results", userLat, userLng, effectiveVisitType, venueType],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recommend-lounges", {
        body: { lat: userLat, lng: userLng, visit_type: effectiveVisitType, venue_type: venueType },
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        city_name: r.city_name ?? "",
        city_slug: r.city_slug ?? "",
        distanceKm: r.distance_km,
        recommendationScore: r.recommendation_score,
      })) as RecommendedLounge[];
    },
    enabled: userLat !== null && userLng !== null,
    staleTime: 5 * 60 * 1000,
  });

  const filteredCities = cityQuery.length > 0
    ? cityOptions.filter((c) => c.city_name.toLowerCase().includes(cityQuery.toLowerCase()))
    : cityOptions;

  const hasLocation = userLat !== null && userLng !== null;

  return (
    <>
      <Helmet>
        <title>For You — Personalized Picks | The Connoisseur</title>
        <meta name="description" content="Get personalized cigar lounge recommendations based on your location and visit style." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-28 md:pb-10">
        <div className="container mx-auto px-4 max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">For You</h1>
          </div>

          {/* Location bar */}
          {hasLocation ? (
            <div className="bg-secondary rounded-xl border border-border/50 p-3 flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-body text-foreground flex-1 truncate">{locationLabel}</span>
              <button
                onClick={changeLocation}
                className="text-xs text-primary hover:underline font-body min-h-[44px] px-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="bg-secondary rounded-xl border border-border/50 p-3 mb-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => { setCityQuery(e.target.value); setShowCityDropdown(true); }}
                  onFocus={() => setShowCityDropdown(true)}
                  placeholder="Search a city..."
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showCityDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCities.slice(0, 20).map((city) => (
                      <button
                        key={city.city_id}
                        onClick={() => selectCity(city)}
                        className="w-full text-left px-3 py-2.5 text-sm font-body text-foreground hover:bg-secondary transition-colors"
                      >
                        {city.city_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter pills — only when results exist */}
          {results && (
            <div className="mb-4 space-y-2">
              {/* Venue type — always visible */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {(["All", "Lounge", "Shop"] as VenueType[]).map((vt) => (
                  <PillToggle
                    key={vt}
                    active={venueType === vt}
                    onClick={() => setVenueType(vt)}
                    icon={<></>}
                    label={vt === "All" ? "All" : vt === "Lounge" ? "Lounges" : "Shops"}
                  />
                ))}
                {!showVisitStyle && (
                  <button
                    onClick={() => setShowVisitStyle(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-body px-2 whitespace-nowrap"
                  >
                    Refine <ChevronDown className="h-3 w-3" />
                  </button>
                )}
              </div>
              {/* Visit style — shown on demand */}
              {showVisitStyle && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(["Any", "Quick Smoke", "Full Evening"] as (VisitType | "Any")[]).map((vt) => (
                    <PillToggle
                      key={vt}
                      active={visitType === vt}
                      onClick={() => setVisitType(vt)}
                      icon={<></>}
                      label={vt}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content states */}
          {geoLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground font-body text-sm">
                Finding your location…
              </p>
            </div>
          ) : !hasLocation ? (
            <div className="text-center py-16">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body text-sm">
                Search for a city to find lounges near you
              </p>
            </div>
          ) : finding ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-20 animate-pulse bg-secondary border-border/30" />
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <ResultsList
              results={results}
              venueType={venueType}
              locationLabel={locationLabel}
              locationMode={locationLabel === "Current Location" ? "here" : "travelling"}
              onReset={changeLocation}
            />
          ) : results && results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-body text-sm">
                No lounges found within 50 km — try a different city.
              </p>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ForYouPage;
