import {
  Wine, Sofa, AirVent, Wifi, Tv, ShoppingBag,
  UtensilsCrossed, Music, Car, CreditCard, Lock,
  Users, Flame, Coffee, Beer, Cigarette, type LucideIcon,
} from "lucide-react";

const featureIconMap: Record<string, LucideIcon> = {
  "full bar": Wine,
  "bar": Wine,
  "lounge seating": Sofa,
  "lounge area": Sofa,
  "comfortable seating": Sofa,
  "outdoor seating": AirVent,
  "patio": AirVent,
  "terrace": AirVent,
  "wi-fi": Wifi,
  "wifi": Wifi,
  "free wifi": Wifi,
  "tv": Tv,
  "tvs": Tv,
  "television": Tv,
  "retail": ShoppingBag,
  "cigar shop": ShoppingBag,
  "walk-in humidor": Lock,
  "humidor": Lock,
  "humidor locker": Lock,
  "locker service": Lock,
  "food": UtensilsCrossed,
  "food menu": UtensilsCrossed,
  "snacks": UtensilsCrossed,
  "live music": Music,
  "entertainment": Music,
  "events": Music,
  "parking": Car,
  "free parking": Car,
  "credit cards accepted": CreditCard,
  "private events": Users,
  "private room": Users,
  "members only": Users,
  "membership": Users,
  "fireplace": Flame,
  "coffee": Coffee,
  "espresso": Coffee,
  "beer": Beer,
  "craft beer": Beer,
  "cigars": Cigarette,
  "premium cigars": Cigarette,
};

const getFeatureIcon = (feature: string): LucideIcon | null => {
  const lower = feature.toLowerCase().trim();
  if (featureIconMap[lower]) return featureIconMap[lower];
  // partial match
  for (const [key, icon] of Object.entries(featureIconMap)) {
    if (lower.includes(key) || key.includes(lower)) return icon;
  }
  return null;
};

interface FeatureChipsProps {
  features: string[];
}

const FeatureChips = ({ features }: FeatureChipsProps) => {
  if (!features.length) return null;

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Features</h2>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => {
          const Icon = getFeatureIcon(feature);
          return (
            <span
              key={feature}
              className="inline-flex items-center gap-1.5 text-sm font-body px-3 py-1.5 rounded-full bg-secondary text-foreground border border-border/50"
            >
              {Icon && <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              {feature}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default FeatureChips;
