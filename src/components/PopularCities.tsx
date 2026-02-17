import { motion } from "framer-motion";
import CityCard from "./CityCard";

const cities = [
  { name: "Dubai", country: "UAE", loungeCount: 5, slug: "dubai", imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80" },
  { name: "London", country: "United Kingdom", loungeCount: 5, slug: "london", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80" },
  { name: "New York", country: "United States", loungeCount: 5, slug: "new-york", imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80" },
  { name: "Havana", country: "Cuba", loungeCount: 5, slug: "havana", imageUrl: "https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=600&q=80" },
  { name: "Miami", country: "United States", loungeCount: 5, slug: "miami", imageUrl: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=600&q=80" },
  { name: "Madrid", country: "Spain", loungeCount: 3, slug: "madrid", imageUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80" },
  { name: "Hong Kong", country: "China", loungeCount: 4, slug: "hong-kong", imageUrl: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=600&q=80" },
  { name: "Istanbul", country: "Turkey", loungeCount: 3, slug: "istanbul", imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80" },
];

const PopularCities = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Popular Cities
          </h2>
          <p className="mt-3 text-muted-foreground font-body">
            Explore top cigar destinations around the world
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {cities.map((city, index) => (
            <CityCard key={city.slug} {...city} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularCities;
