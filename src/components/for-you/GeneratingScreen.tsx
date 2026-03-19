import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  "Consulting the humidor...",
  "Ranking the finest selections...",
  "Curating your itinerary...",
  "Almost ready...",
];

export const GeneratingScreen = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <motion.div
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Sparkles className="h-12 w-12 text-primary" />
      </motion.div>
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-muted-foreground font-body text-sm text-center"
          >
            {phrases[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};
