import { Helmet } from "react-helmet-async";

interface LoungeJsonLdProps {
  lounge: {
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    image_url?: string | null;
    rating: number;
    review_count: number;
    latitude?: number | null;
    longitude?: number | null;
    price_tier: number;
  };
  cityName: string;
  cityCountry: string;
}

const LoungeJsonLd = ({ lounge, cityName, cityCountry }: LoungeJsonLdProps) => {
  const priceRange = "$".repeat(lounge.price_tier);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: lounge.name,
    description: lounge.description || `${lounge.name} — a cigar venue in ${cityName}, ${cityCountry}`,
    ...(lounge.address && { address: { "@type": "PostalAddress", streetAddress: lounge.address, addressLocality: cityName, addressCountry: cityCountry } }),
    ...(lounge.phone && { telephone: lounge.phone }),
    ...(lounge.website && { url: lounge.website }),
    ...(lounge.image_url && { image: lounge.image_url }),
    ...(lounge.latitude && lounge.longitude && { geo: { "@type": "GeoCoordinates", latitude: lounge.latitude, longitude: lounge.longitude } }),
    priceRange,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(lounge.rating).toFixed(1),
      reviewCount: lounge.review_count,
      bestRating: 5,
      worstRating: 1,
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <meta name="description" content={`${lounge.name} in ${cityName} — rated ${Number(lounge.rating).toFixed(1)}★ by ${lounge.review_count} reviews. ${lounge.description?.slice(0, 120) || `Discover this cigar venue in ${cityName}.`}`} />
    </Helmet>
  );
};

export default LoungeJsonLd;
