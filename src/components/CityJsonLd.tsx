import { Helmet } from "react-helmet-async";

interface CityJsonLdProps {
  city: {
    name: string;
    country: string;
    image_url: string | null;
    lounge_count: number;
    slug: string;
  };
}

const CityJsonLd = ({ city }: CityJsonLdProps) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${city.name} Cigar Lounges`,
    description: `Discover the ${city.lounge_count} best cigar lounges and shops in ${city.name}, ${city.country}. Rated by The Connoisseur.`,
    url: `https://theconnoissuer.lovable.app/city/${city.slug}`,
    ...(city.image_url && { image: city.image_url }),
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://theconnoissuer.lovable.app/" },
        { "@type": "ListItem", position: 2, name: city.name, item: `https://theconnoissuer.lovable.app/city/${city.slug}` },
      ],
    },
  };

  return (
    <Helmet>
      <meta
        name="description"
        content={`Discover the ${city.lounge_count} best cigar lounges and shops in ${city.name}, ${city.country}. Curated ratings and reviews by The Connoisseur.`}
      />
      <meta property="og:title" content={`${city.name} Cigar Lounges — The Connoisseur`} />
      <meta
        property="og:description"
        content={`Explore ${city.lounge_count} top-rated cigar lounges in ${city.name}, ${city.country}.`}
      />
      {city.image_url && <meta property="og:image" content={city.image_url} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`https://theconnoissuer.lovable.app/city/${city.slug}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${city.name} Cigar Lounges — The Connoisseur`} />
      <meta
        name="twitter:description"
        content={`Explore ${city.lounge_count} top-rated cigar lounges in ${city.name}, ${city.country}.`}
      />
      {city.image_url && <meta name="twitter:image" content={city.image_url} />}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default CityJsonLd;
