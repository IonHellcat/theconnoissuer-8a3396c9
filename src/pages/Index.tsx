import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhyConnoisseur from "@/components/WhyConnoisseur";
import PopularCities from "@/components/PopularCities";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>The Connoisseur — Discover the World's Finest Cigar Lounges</title>
        <meta name="description" content="The world's most curated guide to cigar lounges. Discover top-rated cigar lounges and shops across the globe with the Connoisseur Score." />
      </Helmet>
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <WhyConnoisseur />
        <PopularCities />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
