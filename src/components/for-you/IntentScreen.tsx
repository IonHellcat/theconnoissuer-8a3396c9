import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CityOption } from "@/pages/ForYouPage";
import type { VenuePreference } from "@/lib/recommendations";

interface SetupScreenProps {
  cityOptions: CityOption[];
  selectedCity: CityOption | null;
  stopCount: number | null;
  preference: VenuePreference;
  onSelectCity: (city: CityOption) => void;
  onSetStopCount: (n: number) => void;
  onSetPreference: (p: VenuePreference) => void;
  onBuild: () => void;
  canBuild: boolean;
}

export const SetupScreen = ({
  cityOptions, selectedCity, stopCount, preference,
  onSelectCity, onSetStopCount, onSetPreference, onBuild, canBuild,
}: SetupScreenProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.length > 0
    ? cityOptions.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.country.toLowerCase().includes(query.toLowerCase()))
    : cityOptions;

  const selectCity = (city: CityOption) => {
    onSelectCity(city);
    setQuery(city.name);
    setOpen(false);
  };

  const stopOptions = [1, 2, 3, 4];
  const prefOptions: { value: VenuePreference; label: string }[] = [
    { value: "lounge", label: "Lounges only" },
    { value: "shop", label: "Shops only" },
    { value: "both", label: "Both" },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header */}
      <div className="text-center">
        <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
        <h1 className="font-display text-3xl font-bold text-foreground">Plan Your Trip</h1>
        <p className="text-muted-foreground font-body text-sm mt-1">
          Your personal cigar itinerary, curated by score
        </p>
      </div>

      {/* City selector */}
      <div className="w-full" ref={ref}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (selectedCity) onSelectCity(null as any); }}
          onFocus={() => setOpen(true)}
          placeholder="Which city are you visiting?"
          className="w-full h-12 rounded-xl border border-border bg-card px-4 text-base font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-w-md bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {filtered.slice(0, 30).map((city) => (
              <button
                key={city.id}
                onClick={() => selectCity(city)}
                className="w-full text-left px-4 py-3 text-sm font-body text-foreground hover:bg-secondary transition-colors flex items-center justify-between"
              >
                <span>{city.name}</span>
                <span className="text-xs text-muted-foreground">{city.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stop count */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="w-full flex flex-col gap-2"
          >
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              How many stops?
            </label>
            <div className="grid grid-cols-4 gap-3">
              {stopOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => onSetStopCount(n)}
                  className={`h-14 rounded-xl border-2 text-lg font-display font-bold transition-all ${
                    stopCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Venue preference */}
      <AnimatePresence>
        {selectedCity && stopCount && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="w-full flex flex-col gap-2"
          >
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">
              What are you looking for?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {prefOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSetPreference(opt.value)}
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-body font-medium transition-all ${
                    preference === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {canBuild && selectedCity && stopCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <button
              onClick={onBuild}
              className="w-full h-[52px] rounded-xl bg-primary text-primary-foreground font-display text-lg font-semibold transition-all hover:brightness-110 active:scale-[0.98] animate-pulse"
              style={{ animationDuration: "2s", animationIterationCount: "3" }}
            >
              Build My Itinerary
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
