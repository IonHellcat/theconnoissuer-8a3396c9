import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, Plane, Clock, Wine, Search, ArrowLeft, Locate } from "lucide-react";
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
  haversine,
  type LoungeWithCoords,
  type RecommendedLounge,
  type VisitType,
} from "@/lib/recommendations";

type LocationMode = "here" | "travelling" | null;

interface CityOption {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
}

const ForYouPage = () => {
  // --- data ---
  const [allLounges, setAllLounges] = useState<LoungeWithCoords[]>([]);
  const [loading, setLoading] = useState(true);

  // --- intent state ---
  const [locationMode, setLocationMode] = useState<LocationMode>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [geoError, setGeoError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // city search
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // --- results ---
  const [results, setResults] = useState<RecommendedLounge[] | null>(null);

  // Fetch all lounges once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lounges")
        .select("id, name, slug, latitude, longitude, connoisseur_score, visit_type, address, image_url, score_label, score_source, score_summary, rating, city_id, cities(name, slug)")
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

  // Derive city options from lounges
  useEffect(() => {
    const map = new Map<string, { lats: number[]; lngs: number[]; name: string }>();
    allLounges.forEach((l) => {
      if (!l.city_id || l.latitude == null || l.longitude == null) return;
      const existing = map.get(l.city_id);
      if (existing) {
        existing.lats.push(l.latitude);
        existing.lngs.push(l.longitude);
      } else {
        map.set(l.city_id, {
          lats: [l.latitude],
          lngs: [l.longitude],
          name: l.city_name ?? "",
        });
      }
    });
    const options: CityOption[] = [];
    map.forEach((v, k) => {
      const lat = v.lats.reduce((a, b) => a + b, 0) / v.lats.length;
      const lng = v.lngs.reduce((a, b) => a + b, 0) / v.lngs.length;
      options.push({ city_id: k, city_name: v.name, lat, lng });
    });
    options.sort((a, b) => a.city_name.localeCompare(b.city_name));
    setCityOptions(options);
  }, [allLounges]);

  // Handle geolocation
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
    const recs = getRecommendations(userLat!, userLng!, visitType!, allLounges);
    setResults(recs);
  };

  const resetSearch = () => {
    setResults(null);
    setLocationMode(null);
    setVisitType(null);
    setUserLat(null);
    setUserLng(null);
    setLocationLabel("");
    setCityQuery("");
    setGeoError(false);
  };

  const filteredCities = cityQuery.length > 0
    ? cityOptions.filter((c) =>
        c.city_name.toLowerCase().includes(cityQuery.toLowerCase()),
      )
    : cityOptions;

  // ---------- Render ----------

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
        <title>For You — Personalized Lounge Picks | The Connoisseur</title>
        <meta
          name="description"
          content="Get personalized cigar lounge recommendations based on your location and visit style."
        />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          {results === null ? (
            /* ===== STEP 1 — INTENT SCREEN ===== */
            <div className="flex flex-col gap-8">
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  For You
                </h1>
                <p className="text-muted-foreground font-body text-sm mt-1">
                  Personalized lounge picks, ranked just for you.
                </p>
              </div>

              {/* Location */}
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Where are you smoking?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleCard
                    active={locationMode === "here"}
                    onClick={() => {
                      setLocationMode("here");
                      setCityQuery("");
                    }}
                    icon={<Locate className="h-5 w-5" />}
                    label="I'm here now"
                  />
                  <ToggleCard
                    active={locationMode === "travelling"}
                    onClick={() => {
                      setLocationMode("travelling");
                      setUserLat(null);
                      setUserLng(null);
                      setLocationLabel("");
                    }}
                    icon={<Plane className="h-5 w-5" />}
                    label="I'm travelling"
                  />
                </div>

                {geoLoading && (
                  <p className="text-xs text-muted-foreground font-body animate-pulse">
                    Getting your location…
                  </p>
                )}

                {geoError && (
                  <p className="text-xs text-destructive font-body">
                    Location access denied — search for a city instead.
                  </p>
                )}

                {locationMode === "here" && userLat !== null && (
                  <p className="text-xs text-primary font-body flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Using current location
                  </p>
                )}

                {(locationMode === "travelling" || geoError) && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={cityQuery}
                      onChange={(e) => {
                        setCityQuery(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      placeholder="Search for a city…"
                      className="pl-10 bg-secondary border-border/50"
                    />
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCities.map((c) => (
                          <button
                            key={c.city_id}
                            onClick={() => selectCity(c)}
                            className="w-full text-left px-4 py-2.5 text-sm font-body text-foreground hover:bg-secondary transition-colors"
                          >
                            {c.city_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Visit type */}
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  What kind of visit?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleCard
                    active={visitType === "Quick Smoke"}
                    onClick={() => setVisitType("Quick Smoke")}
                    icon={<Clock className="h-5 w-5" />}
                    label="Quick Smoke"
                  />
                  <ToggleCard
                    active={visitType === "Full Evening"}
                    onClick={() => setVisitType("Full Evening")}
                    icon={<Wine className="h-5 w-5" />}
                    label="Full Evening"
                  />
                </div>
              </section>

              <Button
                onClick={handleFind}
                disabled={!canSubmit}
                className="w-full h-12 text-base font-body font-semibold"
              >
                Find lounges
              </Button>
            </div>
          ) : (
            /* ===== STEP 2 — RESULTS SCREEN ===== */
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-body">
                    {results.length} lounge{results.length !== 1 ? "s" : ""}{" "}
                    ranked for you in {locationLabel || "your area"}
                  </p>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-xs text-primary hover:underline font-body flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Change search
                </button>
              </div>

              {results.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground font-body">
                    No lounges found within 50 km. Try a different city.
                  </p>
                </div>
              )}

              {results.map((lounge) => (
                <Link key={lounge.id} to={`/lounge/${lounge.slug}`}>
                  <Card className="flex items-center gap-4 p-4 hover:border-primary/40 transition-colors">
                    <ConnoisseurScoreBadge
                      score={lounge.connoisseur_score}
                      scoreLabel={lounge.score_label}
                      scoreSource={lounge.score_source}
                      googleRating={lounge.rating}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">
                        {lounge.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body truncate">
                        {lounge.city_name}
                      </p>
                      {lounge.address && (
                        <p className="text-xs text-muted-foreground/70 font-body truncate mt-0.5">
                          {lounge.address}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-body text-muted-foreground whitespace-nowrap">
                        {locationMode === "travelling"
                          ? `in ${lounge.city_name}`
                          : `${lounge.distanceKm.toFixed(1)} km`}
                      </span>
                      {lounge.visit_type && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {lounge.visit_type}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

/* ---------- Toggle Card Component ---------- */

function ToggleCard({
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
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 transition-all font-body text-sm font-medium ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-border/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default ForYouPage;
