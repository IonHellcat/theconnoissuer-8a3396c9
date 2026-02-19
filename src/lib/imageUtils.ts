/**
 * Generate an optimized Supabase Storage image URL using render/image transforms.
 * Falls back to original URL for non-Supabase images.
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality = 75
): string {
  if (!url || !url.includes("/storage/v1/object/public/")) return url;
  return url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  ) + `?width=${width}&quality=${quality}&resize=cover`;
}

/**
 * Generate srcSet for responsive images from a Supabase Storage URL.
 */
export function getImageSrcSet(
  url: string,
  widths: number[] = [320, 640, 960],
  quality = 75
): string {
  if (!url || !url.includes("/storage/v1/object/public/")) return "";
  return widths
    .map((w) => `${getOptimizedImageUrl(url, w, quality)} ${w}w`)
    .join(", ");
}
