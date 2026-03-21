import { useState, useEffect, useRef, forwardRef } from "react";
import { getOptimizedImageUrl, getImageSrcSet } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
  loungeId?: string;
  cachedSrc?: string | null;
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
  loungeId,
  cachedSrc,
}, ref) => {
  // Prefer cached storage URL over original src
  const baseSrc = cachedSrc || src;
  const resolvedSrc = resolveImageSrc(baseSrc);
  const isProxy = resolvedSrc !== baseSrc;
  const isSentinel = src === "no_photo" || src === "not_found";

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(isSentinel);
  const [refreshedSrc, setRefreshedSrc] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Check if the image is already cached/complete on mount
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  // Merge forwarded ref with internal ref
  const setRefs = (el: HTMLImageElement | null) => {
    imgRef.current = el;
    if (typeof ref === "function") {
      ref(el);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLImageElement | null>).current = el;
    }
  };

  const handleError = async () => {
    if (loungeId && !refreshedSrc && !refreshing) {
      setRefreshing(true);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/refresh-lounge-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY,
            },
            body: JSON.stringify({ lounge_id: loungeId }),
          }
        );
        if (res.ok) {
          const { url } = await res.json();
          if (url) {
            setRefreshedSrc(url);
            setLoaded(false);
            setRefreshing(false);
            return;
          }
        }
      } catch {
        // fall through to error state
      }
      setRefreshing(false);
    }
    setErrored(true);
    setLoaded(true);
  };

  if (errored) {
    return (
      <div
        className={cn(
          "bg-secondary flex items-center justify-center",
          className
        )}
        style={{ width, height }}
      >
        <svg
          className="h-8 w-8 text-muted-foreground/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const effectiveSrc = refreshedSrc || baseSrc;
  const effectiveResolved = refreshedSrc ? resolveImageSrc(refreshedSrc) : resolvedSrc;
  const effectiveIsProxy = effectiveResolved !== effectiveSrc;

  const displaySrc = effectiveIsProxy
    ? effectiveResolved
    : getOptimizedImageUrl(effectiveSrc, width, quality);

  const srcSet = effectiveIsProxy
    ? undefined
    : (getImageSrcSet(effectiveSrc, widths, quality) || undefined);

  return (
    <img
      ref={setRefs}
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
          handleError();
          return;
        }
        setLoaded(true);
      }}
      onError={() => handleError()}
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
