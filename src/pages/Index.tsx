import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhyConnoisseur from "@/components/WhyConnoisseur";
import PopularCities from "@/components/PopularCities";
import ForYouPromo from "@/components/ForYouPromo";
import Footer from "@/components/Footer";
import TrendingThisWeek from "@/components/TrendingThisWeek";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>The Connoisseur — Discover the World's Finest Cigar Lounges</title>
        <meta name="description" content="The world's most curated guide to cigar lounges. Discover top-rated cigar lounges and shops across the globe with the Connoisseur Score." />
        <link rel="canonical" href="https://theconnoisseur.app/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "The Connoisseur",
          "url": "https://theconnoisseur.app",
          "description": "The world's most curated guide to cigar lounges and shops.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://theconnoisseur.app/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}</script>
      </Helmet>
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <WhyConnoisseur />
        <ForYouPromo />
        <PopularCities />
        <TrendingThisWeek />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
