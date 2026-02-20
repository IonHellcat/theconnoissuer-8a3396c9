import { useState, forwardRef } from "react";
import { getOptimizedImageUrl, getImageSrcSet } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  loading?: "lazy" | "eager";
  widths?: number[];
  quality?: number;
}

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  alt,
  width = 640,
  height,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  loading = "lazy",
  widths = [320, 640, 960],
  quality = 75,
}, ref) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      ref={ref}
      src={getOptimizedImageUrl(src, width, quality)}
      srcSet={getImageSrcSet(src, widths, quality) || undefined}
      sizes={getImageSrcSet(src, widths, quality) ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";
export default OptimizedImage;
