import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, Plane, Clock, Wine, Search, ArrowLeft, Locate, Armchair, Store, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConnoisseurScoreBadge from "@/components/ConnoisseurScoreBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  getRecommendations,
  type LoungeWithCoords,
  type RecommendedLounge,
  type VisitType,
  type VenueType,
} from "@/lib/recommendations";

type LocationMode = "here" | "travelling" | null;

interface CityOption {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
}

const ForYouPage = () => {
  const [allLounges, setAllLounges] = useState<LoungeWithCoords[]>([]);
  const [loading, setLoading] = useState(true);

  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [venueType, setVenueType] = useState<VenueType>("All");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoError, setGeoError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [results, setResults] = useState<RecommendedLounge[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lounges")
        .select("id, name, slug, latitude, longitude, connoisseur_score, visit_type, type, address, image_url, score_label, score_source, score_summary, rating, city_id, cities(name, slug)")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (data) {
        setAllLounges(
          data.map((l: any) => ({
            ...l,
            city_name: l.cities?.name ?? "",
            city_slug: l.cities?.slug ?? "",
          })),
        );
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const map = new Map<string, { lats: number[]; lngs: number[]; name: string }>();
    allLounges.forEach((l) => {
      if (!l.city_id || l.latitude == null || l.longitude == null) return;
      const existing = map.get(l.city_id);
      if (existing) {
        existing.lats.push(l.latitude);
        existing.lngs.push(l.longitude);
      } else {
        map.set(l.city_id, { lats: [l.latitude], lngs: [l.longitude], name: l.city_name ?? "" });
      }
    });
    const options: CityOption[] = [];
    map.forEach((v, k) => {
      options.push({
        city_id: k,
        city_name: v.name,
        lat: v.lats.reduce((a, b) => a + b, 0) / v.lats.length,
        lng: v.lngs.reduce((a, b) => a + b, 0) / v.lngs.length,
      });
    });
    options.sort((a, b) => a.city_name.localeCompare(b.city_name));
    setCityOptions(options);
  }, [allLounges]);

  const requestGeo = useCallback(() => {
    setGeoLoading(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationLabel("Current Location");
        setGeoLoading(false);
      },
      () => {
        setGeoError(true);
        setGeoLoading(false);
        setLocationMode("travelling");
      },
    );
  }, []);

  useEffect(() => {
    if (locationMode === "here") requestGeo();
  }, [locationMode, requestGeo]);

  const selectCity = (city: CityOption) => {
    setUserLat(city.lat);
    setUserLng(city.lng);
    setLocationLabel(city.city_name);
    setShowCityDropdown(false);
    setCityQuery(city.city_name);
  };

  const canSubmit = userLat !== null && userLng !== null && visitType !== null;

  const handleFind = () => {
    if (!canSubmit) return;
    setResults(getRecommendations(userLat!, userLng!, visitType!, allLounges, venueType));
  };

  const resetSearch = () => {
    setResults(null);
    setLocationMode(null);
    setVisitType(null);
    setVenueType("All");
    setUserLat(null);
    setUserLng(null);
    setLocationLabel("");
    setCityQuery("");
    setGeoError(false);
  };

  const filteredCities = cityQuery.length > 0
    ? cityOptions.filter((c) => c.city_name.toLowerCase().includes(cityQuery.toLowerCase()))
    : cityOptions;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center pt-16">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>For You — Personalized Picks | The Connoisseur</title>
        <meta name="description" content="Get personalized cigar lounge recommendations based on your location and visit style." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-lg">
          {results === null ? (
            /* ===== INTENT SCREEN ===== */
            <div className="flex flex-col gap-5">
              {/* Header — compact */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h1 className="font-display text-2xl font-bold text-foreground">For You</h1>
                </div>
                <p className="text-muted-foreground font-body text-xs">
                  Location · visit style · venue type → your top picks
                </p>
              </div>

              {/* 1. Location — pill toggles */}
              <section className="flex flex-col gap-2">
                <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <PillToggle
                    active={locationMode === "here"}
                    onClick={() => { setLocationMode("here"); setCityQuery(""); }}
                    icon={<Locate className="h-4 w-4" />}
                    label="I'm here now"
                  />
                  <PillToggle
                    active={locationMode === "travelling"}
                    onClick={() => { setLocationMode("travelling"); setUserLat(null); setUserLng(null); setLocationLabel(""); }}
                    icon={<Plane className="h-4 w-4" />}
                    label="I'm travelling"
                  />
                </div>

                {geoLoading && (
                  <p className="text-[11px] text-muted-foreground font-body animate-pulse">Getting your location…</p>
                )}
                {geoError && (
                  <p className="text-[11px] text-destructive font-body">Location denied — search a city instead</p>
                )}
                {locationMode === "here" && userLat !== null && (
                  <p className="text-[11px] text-primary font-body flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Using current location
                  </p>
                )}

                {(locationMode === "travelling" || geoError) && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={cityQuery}
                      onChange={(e) => { setCityQuery(e.target.value); setShowCityDropdown(true); }}
                      onFocus={() => setShowCityDropdown(true)}
                      placeholder="Search for a city…"
                      className="pl-10 h-10 bg-secondary border-border/50 text-sm"
                    />
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredCities.map((c) => (
                          <button
                            key={c.city_id}
                            onClick={() => selectCity(c)}
                            className="w-full text-left px-4 py-2.5 text-sm font-body text-foreground hover:bg-secondary transition-colors min-h-[44px]"
                          >
                            {c.city_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 2. Visit type */}
              <section className="flex flex-col gap-2">
                <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Visit style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <PillToggle
                    active={visitType === "Quick Smoke"}
                    onClick={() => setVisitType("Quick Smoke")}
                    icon={<Clock className="h-4 w-4" />}
                    label="Quick Smoke"
                  />
                  <PillToggle
                    active={visitType === "Full Evening"}
                    onClick={() => setVisitType("Full Evening")}
                    icon={<Wine className="h-4 w-4" />}
                    label="Full Evening"
                  />
                </div>
              </section>

              {/* 3. Venue type */}
              <section className="flex flex-col gap-2">
                <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Venue type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <PillToggle active={venueType === "All"} onClick={() => setVenueType("All")} icon={<Search className="h-4 w-4" />} label="All" />
                  <PillToggle active={venueType === "Lounge"} onClick={() => setVenueType("Lounge")} icon={<Armchair className="h-4 w-4" />} label="Lounges" />
                  <PillToggle active={venueType === "Shop"} onClick={() => setVenueType("Shop")} icon={<Store className="h-4 w-4" />} label="Shops" />
                </div>
              </section>

              {/* Sticky CTA */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border/30 z-40">
                <div className="max-w-lg mx-auto">
                  <Button
                    onClick={handleFind}
                    disabled={!canSubmit}
                    className="w-full h-12 text-base font-body font-semibold"
                  >
                    Find lounges
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ===== RESULTS SCREEN ===== */
            <div className="flex flex-col gap-3">
              {/* Sticky header */}
              <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-body">
                    {results.length} {venueType === "All" ? "venue" : venueType.toLowerCase()}{results.length !== 1 ? "s" : ""} in {locationLabel || "your area"}
                  </p>
                  <button
                    onClick={resetSearch}
                    className="text-xs text-primary hover:underline font-body flex items-center gap-1 min-h-[44px] px-2"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change
                  </button>
                </div>
              </div>

              {results.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground font-body text-sm">
                    No venues found within 50 km. Try a different city.
                  </p>
                </div>
              )}

              {results.map((lounge) => (
                <Link key={lounge.id} to={`/lounge/${lounge.slug}`}>
                  <Card className="flex items-center gap-3 p-3 hover:border-primary/40 transition-colors active:scale-[0.98]">
                    <ConnoisseurScoreBadge
                      score={lounge.connoisseur_score}
                      scoreLabel={lounge.score_label}
                      scoreSource={lounge.score_source}
                      googleRating={lounge.rating}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-sm font-semibold text-foreground truncate">
                          {lounge.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 capitalize border-border/50">
                          {lounge.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-body truncate">
                        {lounge.city_name}{lounge.address ? ` · ${lounge.address}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-body text-muted-foreground whitespace-nowrap shrink-0">
                      {locationMode === "travelling"
                        ? lounge.city_name
                        : `${lounge.distanceKm.toFixed(1)} km`}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      {results !== null && <Footer />}
    </>
  );
};

/* ---------- Pill Toggle ---------- */

function PillToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-all font-body text-sm font-medium min-h-[44px] ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-border/80 active:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default ForYouPage;
