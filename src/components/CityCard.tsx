import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { getOptimizedImageUrl, getImageSrcSet } from "@/lib/imageUtils";

interface CityCardProps {
  name: string;
  country: string;
  loungeCount: number;
  imageUrl: string;
  slug: string;
  index: number;
}

const CityCard = ({ name, country, loungeCount, imageUrl, slug, index }: CityCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        to={`/city/${slug}`}
        className="group block relative rounded-xl overflow-hidden aspect-[3/4] bg-secondary"
      >
        {/* Image */}
        <img
          src={getOptimizedImageUrl(imageUrl, 640)}
          srcSet={getImageSrcSet(imageUrl, [320, 640, 960])}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          alt={`${name} cigar lounges`}
          loading="lazy"
          decoding="async"
          width={640}
          height={853}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

        {/* Gold shimmer on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-display text-xl font-bold text-foreground">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1 font-body">{country}</p>
          <div className="flex items-center gap-1.5 mt-2 text-primary">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs font-medium font-body">
              {loungeCount} {loungeCount === 1 ? "lounge" : "lounges"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CityCard;
