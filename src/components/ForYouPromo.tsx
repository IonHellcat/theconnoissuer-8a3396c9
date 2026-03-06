import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

const ForYouPromo = () => (
  <section className="py-16 px-4">
    <div className="container mx-auto max-w-4xl">
      <Link to="/for-you" className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-8 md:p-12 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>

            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Personalized For You
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1 max-w-lg">
                Tell us where you are and how you like to smoke — we'll rank the best lounges near you using the Connoisseur Score.
              </p>
            </div>

            <div className="flex items-center gap-2 text-primary font-body font-semibold text-sm group-hover:gap-3 transition-all">
              Get your picks
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  </section>
);

export default ForYouPromo;
