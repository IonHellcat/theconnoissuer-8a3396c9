import { motion } from "framer-motion";

const WhyConnoisseur = () => {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            How scoring works
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 bg-secondary rounded-xl border border-border/50 p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Estimated */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-sm font-display font-bold text-muted-foreground opacity-60">
                72
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-foreground">Estimated Score</h4>
                <p className="text-xs sm:text-sm text-muted-foreground font-body mt-1">
                  AI-analyzed from public reviews to give every lounge a baseline score
                </p>
              </div>
            </div>

            {/* Verified */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full border-2 border-solid border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)] flex items-center justify-center text-sm font-display font-bold text-foreground">
                88
              </div>
              <div>
                <h4 className="font-display text-sm font-semibold text-foreground">Verified Score</h4>
                <p className="text-xs sm:text-sm text-muted-foreground font-body mt-1">
                  Community-rated by members who've visited in person — the gold standard
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyConnoisseur;
