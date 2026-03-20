import { useState, forwardRef } from "react";
import { getOptimizedImageUrl, getImageSrcSet } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function resolveImageSrc(src: string): string {
  if (src.includes("places.googleapis.com")) {
    return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(src)}`;
  }
  return src;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
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
  fetchPriority,
  widths = [320, 640, 960],
  quality = 75,
}, ref) => {
  const resolvedSrc = resolveImageSrc(src);
  const isProxy = resolvedSrc !== src;
  const isSentinel = src === "no_photo" || src === "not_found";
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(isSentinel);

  // For proxied URLs, use the proxy URL directly (no srcSet optimization)
  const displaySrc = errored || isSentinel
    ? "/placeholder.svg"
    : isProxy
      ? resolvedSrc
      : getOptimizedImageUrl(src, width, quality);

  const srcSet = errored || isSentinel || isProxy
    ? undefined
    : (getImageSrcSet(src, widths, quality) || undefined);

  return (
    <img
      ref={ref}
      src={displaySrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      {...(fetchPriority ? { fetchPriority } : {})}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth === 0) {
          if (!errored) setErrored(true);
        }
        setLoaded(true);
      }}
      onError={() => {
        if (!errored) {
          setErrored(true);
          setLoaded(true);
        }
      }}
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
