import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PopularCities from "@/components/PopularCities";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <PopularCities />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
