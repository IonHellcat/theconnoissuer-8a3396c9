import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";

const ForYouPromo = () => (
  <section className="py-8 md:py-12 px-4">
    <div className="container mx-auto max-w-4xl">
      <Link to="/for-you" className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-5 md:p-10 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)] active:scale-[0.99]">
          <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MapPin className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                Plan Your Cigar Trip
              </h2>
              <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">
                Tell us which city you're visiting and we'll build a personalised cigar itinerary
              </p>
            </div>

            <ArrowRight className="h-5 w-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  </section>
);

export default ForYouPromo;
