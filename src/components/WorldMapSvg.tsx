import { useMemo } from "react";
import worldData from "@/assets/world-land.json";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

interface WorldMapSvgProps {
  className?: string;
  markers?: MapMarker[];
}

/** Converts GeoJSON lng/lat to simple equirectangular SVG coordinates */
function coordsToSvgPath(coords: number[][]): string {
  return coords
    .map(([lng, lat], i) => {
      const x = ((lng + 180) / 360) * 1000;
      const y = ((90 - lat) / 180) * 500;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + "Z";
}

function featureToPath(geometry: any): string {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring: number[][]) => coordsToSvgPath(ring)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((polygon: number[][][]) =>
        polygon.map((ring: number[][]) => coordsToSvgPath(ring)).join(" ")
      )
      .join(" ");
  }
  return "";
}

const WorldMapSvg = ({ className, markers }: WorldMapSvgProps) => {
  const pathData = useMemo(() => {
    const features = (worldData as any).features;
    return features.map((f: any) => featureToPath(f.geometry)).join(" ");
  }, []);

  return (
    <svg
      viewBox="0 0 1000 500"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={pathData} fill="currentColor" fillRule="evenodd" />
      {markers?.map((m) => {
        const cx = ((m.lng + 180) / 360) * 1000;
        const cy = ((90 - m.lat) / 180) * 500;
        return (
          <circle
            key={m.id}
            cx={cx}
            cy={cy}
            r={6}
            className="fill-primary"
            filter="url(#marker-glow)"
            opacity={0.9}
          >
            {m.label && <title>{m.label}</title>}
          </circle>
        );
      })}
    </svg>
  );
};

export default WorldMapSvg;
