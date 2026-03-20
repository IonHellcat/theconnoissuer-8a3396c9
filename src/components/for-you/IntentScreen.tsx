import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MapPin, Search, X, Check } from "lucide-react";
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

interface FlatItem {
  type: "header" | "city";
  country?: string;
  city?: CityOption;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SetupScreen = ({
  cityOptions, selectedCity, stopCount, preference,
  onSelectCity, onSetStopCount, onSetPreference, onBuild, canBuild,
}: SetupScreenProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (query.length === 0) return cityOptions;
    const q = query.toLowerCase();
    return cityOptions.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    );
  }, [query, cityOptions]);

  // Build flat list with country headers
  const flatItems = useMemo<FlatItem[]>(() => {
    const sorted = [...filtered].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
    const items: FlatItem[] = [];
    let lastCountry = "";
    for (const city of sorted) {
      if (city.country !== lastCountry) {
        items.push({ type: "header", country: city.country });
        lastCountry = city.country;
      }
      items.push({ type: "city", city });
    }
    return items;
  }, [filtered]);

  // Only city items for keyboard nav indexing
  const cityItems = useMemo(() => flatItems.filter((i) => i.type === "city"), [flatItems]);

  const selectCity = useCallback((city: CityOption) => {
    onSelectCity(city);
    setQuery(city.name);
    setOpen(false);
    setHighlightedIndex(-1);
  }, [onSelectCity]);

  const clearInput = () => {
    setQuery("");
    setHighlightedIndex(-1);
    if (selectedCity) onSelectCity(null as any);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, cityItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < cityItems.length) {
          selectCity(cityItems[highlightedIndex].city!);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const el = itemRefs.current.get(highlightedIndex);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex]);

  const stopOptions = [1, 2, 3, 4];
  const prefOptions: { value: VenuePreference; label: string }[] = [
    { value: "lounge", label: "Lounges only" },
    { value: "shop", label: "Shops only" },
    { value: "both", label: "Both" },
  ];

  let cityIdx = -1; // running index for city items only

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
      <div className="w-full relative" ref={ref}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlightedIndex(-1);
              if (selectedCity) onSelectCity(null as any);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Which city are you visiting?"
            className="w-full h-12 rounded-xl border border-border bg-card pl-10 pr-10 text-base font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
          />
          {query && (
            <button
              onClick={clearInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && (
          <div
            ref={listRef}
            className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-80 overflow-y-auto scroll-smooth"
          >
            {flatItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No cities found
              </div>
            ) : (
              flatItems.map((item, i) => {
                if (item.type === "header") {
                  return (
                    <div
                      key={`h-${item.country}`}
                      className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-sm px-4 py-1.5 text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {item.country}
                    </div>
                  );
                }

                cityIdx++;
                const currentIdx = cityIdx;
                const city = item.city!;
                const isHighlighted = currentIdx === highlightedIndex;
                const isSelected = selectedCity?.id === city.id;

                return (
                  <button
                    key={city.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(currentIdx, el);
                      else itemRefs.current.delete(currentIdx);
                    }}
                    onClick={() => selectCity(city)}
                    className={`w-full text-left px-4 py-3 text-sm font-body transition-colors flex items-center gap-2 ${
                      isHighlighted
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <span className="flex-1 truncate">{highlightMatch(city.name, query)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {city.loungeCount} {city.loungeCount === 1 ? "venue" : "venues"}
                    </span>
                  </button>
                );
              })
            )}
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
