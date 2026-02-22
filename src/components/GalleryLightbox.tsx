import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import OptimizedImage from "./OptimizedImage";

interface GalleryLightboxProps {
  images: string[];
  loungeName: string;
}

const GalleryLightbox = ({ images, loungeName }: GalleryLightboxProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null)),
    [images.length]
  );
  const next = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null)),
    [images.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, close, prev, next]);

  if (!images.length) return null;

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <OptimizedImage
              src={img}
              alt={`${loungeName} photo ${i + 1}`}
              width={480}
              height={480}
              sizes="(max-width: 768px) 50vw, 33vw"
              widths={[240, 480]}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
            onClick={close}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-card/80 text-foreground hover:bg-card transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-4 z-50 p-2 rounded-full bg-card/80 text-foreground hover:bg-card transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-4 z-50 p-2 rounded-full bg-card/80 text-foreground hover:bg-card transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl max-h-[85vh] w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <OptimizedImage
                src={images[lightboxIndex]}
                alt={`${loungeName} photo ${lightboxIndex + 1}`}
                width={1280}
                height={960}
                sizes="100vw"
                widths={[640, 960, 1280]}
                className="w-full h-full object-contain rounded-lg"
              />
              <p className="text-center text-sm text-muted-foreground font-body mt-3">
                {lightboxIndex + 1} / {images.length}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryLightbox;
