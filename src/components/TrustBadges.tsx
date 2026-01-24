import { Shield, Truck, RefreshCw, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export const TrustBadges = () => {
  const badges = [
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Free Shipping",
      description: "On orders over $100"
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "Easy Returns",
      description: "30-day return policy"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Payment",
      description: "100% secure checkout"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Multiple Payment",
      description: "All major cards accepted"
    }
  ];

  return (
    <section className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-pink-50 border-y border-border/50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {badges.map((badge, index) => (
            <motion.div 
              key={index} 
              className="flex flex-col items-center text-center p-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="mb-4 p-3 rounded-full bg-gradient-to-br from-amber-100 to-pink-100 text-primary shadow-md">
                {badge.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
