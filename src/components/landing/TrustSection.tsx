import { Shield, Globe, Flag, Clock, CreditCard } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const BADGES = [
  { icon: Shield, label: "Conforme RGPD" },
  { icon: Globe, label: "Dados na UE" },
  { icon: Flag, label: "Suporte em Português" },
  { icon: Clock, label: "Cancelamento livre" },
  { icon: CreditCard, label: "14 dias grátis" },
];

export function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-12 md:py-16 bg-slate-900/50 border-y border-slate-800/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-6 md:gap-10"
        >
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
