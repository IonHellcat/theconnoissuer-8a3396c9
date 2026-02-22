import { MapPin } from "lucide-react";

interface MapEmbedProps {
  latitude: number;
  longitude: number;
  name: string;
}

const MapEmbed = ({ latitude, longitude, name }: MapEmbedProps) => {
  // Use OpenStreetMap static tile as a free map preview
  const zoom = 15;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.003},${longitude + 0.005},${latitude + 0.003}&layer=mapnik&marker=${latitude},${longitude}`;
  const linkUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(name)}`;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="relative aspect-[4/3] w-full">
        <iframe
          src={mapUrl}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          title={`Map showing ${name}`}
          aria-label={`Map showing location of ${name}`}
        />
      </div>
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-3 text-sm font-body text-primary hover:text-primary/80 transition-colors"
      >
        <MapPin className="h-3.5 w-3.5" />
        View on Google Maps
      </a>
    </div>
  );
};

export default MapEmbed;
