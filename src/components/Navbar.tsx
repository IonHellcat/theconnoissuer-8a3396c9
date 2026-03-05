import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Search, Menu, X, User, LogOut, Heart } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <img src={logo} alt="The Connoisseur" className="h-8 w-8 object-contain" />
            <span className="font-display text-xl font-bold text-gradient-gold">
              The Connoisseur
            </span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cities, lounges..."
                className="pl-10 bg-secondary border-border/50 focus:border-primary h-9 text-sm"
              />
            </div>
          </form>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Explore Cities
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link to="/favorites">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Heart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/profile">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-body font-medium text-primary hover:bg-primary/30 transition-colors cursor-pointer">
                    {(user.email || "?")[0].toUpperCase()}
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay — outside nav to avoid backdrop-filter stacking context */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-background animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col h-full px-6 pt-6 pb-8 overflow-y-auto">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cities, lounges..."
                  className="pl-12 bg-secondary border-border/50 h-12 text-base rounded-xl"
                  autoFocus
                />
              </div>
            </form>

            <nav className="flex flex-col gap-1">
              <Link
                to="/explore"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-body text-foreground hover:bg-secondary transition-colors"
              >
                <Search className="h-5 w-5 text-primary" />
                Explore Cities
              </Link>
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-body text-foreground hover:bg-secondary transition-colors"
                  >
                    <User className="h-5 w-5 text-primary" />
                    My Profile
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-body text-foreground hover:bg-secondary transition-colors"
                  >
                    <Heart className="h-5 w-5 text-primary" />
                    My Favorites
                  </Link>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-body text-foreground hover:bg-secondary transition-colors"
                >
                  <User className="h-5 w-5 text-primary" />
                  Log In
                </Link>
              )}
            </nav>

            {user && (
              <div className="mt-auto pt-6 border-t border-border/30">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-body text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
