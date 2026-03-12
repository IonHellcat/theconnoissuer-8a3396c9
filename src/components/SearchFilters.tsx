import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "vaul";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "relevance" | "rating_desc" | "rating_asc" | "score_desc" | "price_asc" | "price_desc" | "name_asc";

export interface SearchFilterValues {
  venueTypes: string[];
  priceTiers: number[];
  ratingRange: [number, number];
  features: string[];
  sort: SortOption;
}

const VENUE_TYPES = [
  { value: "lounge", label: "Lounge" },
  { value: "shop", label: "Shop" },
  { value: "both", label: "Lounge & Shop" },
];

const PRICE_TIERS = [
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
];

const POPULAR_FEATURES = [
  "Walk-in Humidor",
  "Full Bar",
  "Lounge Seating",
  "Outdoor Seating",
  "Wi-Fi",
  "Food Menu",
  "TV",
  "Private Room",
  "Locker Service",
  "Live Music",
  "Parking",
  "Membership",
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "score_desc", label: "Connoisseur Score" },
  { value: "rating_desc", label: "Rating (High → Low)" },
  { value: "rating_asc", label: "Rating (Low → High)" },
  { value: "price_asc", label: "Price (Low → High)" },
  { value: "price_desc", label: "Price (High → Low)" },
  { value: "name_asc", label: "Name (A → Z)" },
];

interface SearchFiltersProps {
  filters: SearchFilterValues;
  onChange: (filters: SearchFilterValues) => void;
  resultCount?: number;
}

const SearchFilters = ({ filters, onChange, resultCount }: SearchFiltersProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const activeCount =
    filters.venueTypes.length +
    filters.priceTiers.length +
    filters.features.length +
    (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5 ? 1 : 0);

  const toggleVenueType = (type: string) => {
    const next = filters.venueTypes.includes(type)
      ? filters.venueTypes.filter((t) => t !== type)
      : [...filters.venueTypes, type];
    onChange({ ...filters, venueTypes: next });
  };

  const togglePriceTier = (tier: number) => {
    const next = filters.priceTiers.includes(tier)
      ? filters.priceTiers.filter((t) => t !== tier)
      : [...filters.priceTiers, tier];
    onChange({ ...filters, priceTiers: next });
  };

  const toggleFeature = (feature: string) => {
    const next = filters.features.includes(feature)
      ? filters.features.filter((f) => f !== feature)
      : [...filters.features, feature];
    onChange({ ...filters, features: next });
  };

  const clearAll = () => {
    onChange({
      venueTypes: [],
      priceTiers: [],
      ratingRange: [0, 5],
      features: [],
      sort: "relevance",
    });
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block font-body">
          Sort by
        </label>
        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ ...filters, sort: v as SortOption })}
        >
          <SelectTrigger className="w-full bg-secondary border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Venue Type */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block font-body">
          Venue Type
        </label>
        <div className="flex flex-wrap gap-2">
          {VENUE_TYPES.map((vt) => (
            <button
              key={vt.value}
              onClick={() => toggleVenueType(vt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-body border transition-colors ${
                filters.venueTypes.includes(vt.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border/50 hover:border-primary/40"
              }`}
            >
              {vt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Tier */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block font-body">
          Price Range
        </label>
        <div className="flex gap-2">
          {PRICE_TIERS.map((pt) => (
            <button
              key={pt.value}
              onClick={() => togglePriceTier(pt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-colors ${
                filters.priceTiers.includes(pt.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border/50 hover:border-primary/40"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating Range */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-body">
          Google Rating
        </label>
        <p className="text-sm text-muted-foreground font-body mb-3">
          {filters.ratingRange[0].toFixed(1)} – {filters.ratingRange[1].toFixed(1)} stars
        </p>
        <Slider
          min={0}
          max={5}
          step={0.5}
          value={filters.ratingRange}
          onValueChange={(v) =>
            onChange({ ...filters, ratingRange: v as [number, number] })
          }
        />
      </div>

      {/* Features */}
      <div>
        <button
          onClick={() => setFeaturesExpanded(!featuresExpanded)}
          className="flex items-center justify-between w-full mb-3"
        >
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body cursor-pointer">
            Features
          </label>
          {featuresExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence>
          {featuresExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2"
            >
              {POPULAR_FEATURES.map((feature) => (
                <label
                  key={feature}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={filters.features.includes(feature)}
                    onCheckedChange={() => toggleFeature(feature)}
                  />
                  <span className="text-sm font-body text-foreground group-hover:text-primary transition-colors">
                    {feature}
                  </span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear */}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Clear all filters ({activeCount})
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden mb-6"
          >
            <div className="p-4 bg-card rounded-xl border border-border/50">
              {filterContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-28 p-5 bg-card rounded-xl border border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
            {typeof resultCount === "number" && (
              <span className="text-xs text-muted-foreground font-body">
                {resultCount} results
              </span>
            )}
          </div>
          {filterContent}
        </div>
      </div>
    </>
  );
};

export default SearchFilters;
