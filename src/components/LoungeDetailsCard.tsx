import { MapPin, Phone, Globe, ExternalLink, Navigation } from "lucide-react";

interface LoungeDetailsCardProps {
  address: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  className?: string;
}

const LoungeDetailsCard = ({
  address,
  phone,
  website,
  latitude,
  longitude,
  className,
}: LoungeDetailsCardProps) => (
  <div className={`bg-card rounded-xl border border-border/50 p-6 space-y-5 ${className ?? ""}`}>
    <h3 className="font-display text-lg font-semibold text-foreground">Details</h3>

    {address && (
      <div className="flex items-start gap-3">
        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <span className="text-sm text-muted-foreground font-body">{address}</span>
      </div>
    )}

    {phone && (
      <div className="flex items-center gap-3">
        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
        <a href={`tel:${phone}`} className="text-sm text-muted-foreground font-body hover:text-foreground transition-colors">
          {phone}
        </a>
      </div>
    )}

    {website && (
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 text-primary flex-shrink-0" />
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary font-body hover:underline inline-flex items-center gap-1"
        >
          Visit Website
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    )}

    {latitude && longitude && (
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium font-body hover:bg-primary/90 transition-colors"
      >
        <Navigation className="h-4 w-4" />
        Get Directions
      </a>
    )}
  </div>
);

export default LoungeDetailsCard;
