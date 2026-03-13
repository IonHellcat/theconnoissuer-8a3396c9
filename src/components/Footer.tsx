import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border/50 mt-12 sm:mt-20 pb-14 md:pb-0">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img src={logo} alt="The Connoisseur" className="h-8 w-8 object-contain" width={32} height={32} />
              <span className="font-display text-xl font-bold text-gradient-gold">
                The Connoisseur
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
              Discover the world's finest cigar lounges and shops. Your personal guide to the perfect smoke, wherever you travel.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">Discover</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/explore" className="hover:text-foreground transition-colors">Explore Cities</Link></li>
              <li><Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link></li>
              <li><Link to="/search" className="hover:text-foreground transition-colors">Search</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/suggest" className="hover:text-foreground transition-colors">Suggest a Lounge</Link></li>
              <li><Link to="/visited" className="hover:text-foreground transition-colors">My Passport</Link></li>
              <li><Link to="/favorites" className="hover:text-foreground transition-colors">My Favorites</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/30 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} The Connoisseur. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
