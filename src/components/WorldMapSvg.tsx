import { useMemo } from "react";
import worldData from "@/assets/world-land.geojson";

interface WorldMapSvgProps {
  className?: string;
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

const WorldMapSvg = ({ className }: WorldMapSvgProps) => {
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
      <path d={pathData} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
};

export default WorldMapSvg;
