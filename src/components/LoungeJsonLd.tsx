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
    connoisseur_score?: number | null;
    score_label?: string | null;
    hours?: unknown;
  };
  cityName: string;
  cityCountry: string;
}

function parseHoursSpec(hours: unknown) {
  if (!hours || typeof hours !== "object") return undefined;
  try {
    const entries = Object.entries(hours as Record<string, string>);
    if (!entries.length) return undefined;
    const dayMap: Record<string, string> = {
      monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
      thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
      mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
      fri: "Friday", sat: "Saturday", sun: "Sunday",
    };
    return entries
      .map(([day, time]) => {
        const dayOfWeek = dayMap[day.toLowerCase()];
        if (!dayOfWeek || !time) return null;
        const match = time.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
        if (!match) return null;
        return {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: dayOfWeek,
          opens: match[1],
          closes: match[2],
        };
      })
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

const LoungeJsonLd = ({ lounge, cityName, cityCountry }: LoungeJsonLdProps) => {
  const priceRange = "$".repeat(lounge.price_tier);
  const hoursSpec = parseHoursSpec(lounge.hours);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "BarOrPub"],
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

  if (hoursSpec && hoursSpec.length > 0) {
    jsonLd.openingHoursSpecification = hoursSpec;
  }

  if (lounge.connoisseur_score != null) {
    jsonLd.review = {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: lounge.connoisseur_score,
        bestRating: 100,
        worstRating: 0,
        name: "Connoisseur Score",
      },
      author: {
        "@type": "Organization",
        name: "The Connoisseur",
      },
      reviewBody: lounge.score_label
        ? `Rated ${lounge.score_label} with a Connoisseur Score of ${lounge.connoisseur_score}/100`
        : `Connoisseur Score: ${lounge.connoisseur_score}/100`,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <meta name="description" content={`${lounge.name} in ${cityName} — rated ${Number(lounge.rating).toFixed(1)}★ by ${lounge.review_count} reviews. ${lounge.description?.slice(0, 120) || `Discover this cigar venue in ${cityName}.`}`} />
    </Helmet>
  );
};

export default LoungeJsonLd;
