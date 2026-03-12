import { MapPin, Plane, Clock, Wine, Search, Locate, Armchair, Store, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "./PillToggle";
import type { VisitType, VenueType } from "@/lib/recommendations";

type LocationMode = "here" | "travelling" | null;

interface CityOption {
  city_id: string;
  city_name: string;
  lat: number;
  lng: number;
}

interface IntentScreenProps {
  locationMode: LocationMode;
  visitType: VisitType | null;
  venueType: VenueType;
  userLat: number | null;
  geoLoading: boolean;
  geoError: boolean;
  cityQuery: string;
  filteredCities: CityOption[];
  showCityDropdown: boolean;
  canSubmit: boolean;
  finding?: boolean;
  onSetLocationMode: (mode: LocationMode) => void;
  onSetVisitType: (type: VisitType) => void;
  onSetVenueType: (type: VenueType) => void;
  onCityQueryChange: (query: string) => void;
  onCityFocus: () => void;
  onSelectCity: (city: CityOption) => void;
  onFind: () => void;
}

export const IntentScreen = ({
  locationMode, visitType, venueType, userLat, geoLoading, geoError,
  cityQuery, filteredCities, showCityDropdown, canSubmit, finding,
  onSetLocationMode, onSetVisitType, onSetVenueType,
  onCityQueryChange, onCityFocus, onSelectCity, onFind,
}: IntentScreenProps) => (
  <div className="flex flex-col gap-5">
    {/* Header */}
    <div className="text-center">
      <div className="inline-flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">For You</h1>
      </div>
      <p className="text-muted-foreground font-body text-xs">
        Location · visit style · venue type → your top picks
      </p>
    </div>

    {/* 1. Location */}
    <section className="flex flex-col gap-2">
      <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
      <div className="grid grid-cols-2 gap-2">
        <PillToggle active={locationMode === "here"} onClick={() => onSetLocationMode("here")} icon={<Locate className="h-4 w-4" />} label="I'm here now" />
        <PillToggle active={locationMode === "travelling"} onClick={() => onSetLocationMode("travelling")} icon={<Plane className="h-4 w-4" />} label="I'm travelling" />
      </div>
      {geoLoading && <p className="text-[11px] text-muted-foreground font-body animate-pulse">Getting your location…</p>}
      {geoError && <p className="text-[11px] text-destructive font-body">Location denied — search a city instead</p>}
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
            onChange={(e) => onCityQueryChange(e.target.value)}
            onFocus={onCityFocus}
            placeholder="Search for a city…"
            className="pl-10 h-10 bg-secondary border-border/50 text-sm"
          />
          {showCityDropdown && filteredCities.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredCities.map((c) => (
                <button
                  key={c.city_id}
                  onClick={() => onSelectCity(c)}
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
      <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Visit style</label>
      <div className="grid grid-cols-2 gap-2">
        <PillToggle active={visitType === "Quick Smoke"} onClick={() => onSetVisitType("Quick Smoke")} icon={<Clock className="h-4 w-4" />} label="Quick Smoke" />
        <PillToggle active={visitType === "Full Evening"} onClick={() => onSetVisitType("Full Evening")} icon={<Wine className="h-4 w-4" />} label="Full Evening" />
      </div>
    </section>

    {/* 3. Venue type */}
    <section className="flex flex-col gap-2">
      <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Venue type</label>
      <div className="grid grid-cols-3 gap-2">
        <PillToggle active={venueType === "All"} onClick={() => onSetVenueType("All")} icon={<Search className="h-4 w-4" />} label="All" />
        <PillToggle active={venueType === "Lounge"} onClick={() => onSetVenueType("Lounge")} icon={<Armchair className="h-4 w-4" />} label="Lounges" />
        <PillToggle active={venueType === "Shop"} onClick={() => onSetVenueType("Shop")} icon={<Store className="h-4 w-4" />} label="Shops" />
      </div>
    </section>

    {/* Sticky CTA */}
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border/30 z-40">
      <div className="max-w-lg mx-auto">
        <Button onClick={onFind} disabled={!canSubmit || finding} className="w-full h-12 text-base font-body font-semibold">
          {finding ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Finding…</> : "Find lounges"}
        </Button>
      </div>
    </div>
  </div>
);
