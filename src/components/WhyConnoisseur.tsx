import { motion } from "framer-motion";

const pillars = [
  { icon: "🍂", name: "Cigar Selection", desc: "Breadth, quality, and exclusivity of the humidor" },
  { icon: "🏛", name: "Ambiance", desc: "Atmosphere, comfort, and interior character" },
  { icon: "🤝", name: "Service", desc: "Staff knowledge, hospitality, and attention" },
  { icon: "🥃", name: "Drinks", desc: "Bar quality, pairing options, and menu depth" },
  { icon: "💰", name: "Value", desc: "Quality relative to price" },
];

const WhyConnoisseur = () => {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Not just stars. We rate what matters.
          </h2>
          <p className="mt-4 text-muted-foreground font-body max-w-2xl mx-auto text-base md:text-lg">
            The Connoisseur Score goes deeper than Google ratings — analyzing what actually makes a great cigar lounge.
          </p>
        </motion.div>

        {/* Pillar Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-card rounded-xl border border-border/50 p-5 sm:p-6 text-center"
            >
              <span className="text-2xl sm:text-3xl block mb-3">{pillar.icon}</span>
              <h3 className="font-display text-sm sm:text-base font-bold text-primary mb-1.5">
                {pillar.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-body leading-snug">
                {pillar.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Score Explainer Strip */}
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
