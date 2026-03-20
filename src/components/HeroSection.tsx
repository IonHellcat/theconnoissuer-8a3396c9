import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Trophy, Globe } from "lucide-react";
import TrustStats from "./TrustStats";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative min-h-[50vh] sm:min-h-[70vh] md:min-h-[80vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(41_55%_58%/0.08)_0%,transparent_70%)]" />

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A853' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="animate-hero-fade-in-1">
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="text-foreground">Discover the World's</span>
            <br />
            <span className="text-gradient-gold">Finest Cigar Lounges</span>
          </h1>
        </div>

        <p
          className="animate-hero-fade-in-2 mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-body"
        >
          The world's most curated guide to cigar lounges.
        </p>

        <form
          onSubmit={handleSearch}
          className="animate-hero-fade-in-3 mt-5 sm:mt-10 max-w-xl mx-auto px-2 sm:px-0"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-gold-light/50 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative flex items-center bg-secondary rounded-lg border border-border/50">
              <Search className="ml-3 sm:ml-4 h-5 w-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cities or lounges..."
                className="flex-1 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm sm:text-base font-body min-w-0"
              />
              <button
                type="submit"
                className="mr-1.5 sm:mr-2 px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        <div
          className="animate-hero-fade-in-4 mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/for-you"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary border border-border/50 text-sm font-medium font-body text-foreground hover:border-primary/50 transition-colors"
          >
            <MapPin className="h-4 w-4 text-primary" /> Plan a Trip
          </Link>
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary border border-border/50 text-sm font-medium font-body text-foreground hover:border-primary/50 transition-colors"
          >
            <Trophy className="h-4 w-4 text-primary" /> Top Rated
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary border border-border/50 text-sm font-medium font-body text-foreground hover:border-primary/50 transition-colors"
          >
            <Globe className="h-4 w-4 text-primary" /> Browse Cities
          </Link>
        </div>

        <TrustStats />
      </div>
    </section>
  );
};

export default HeroSection;

