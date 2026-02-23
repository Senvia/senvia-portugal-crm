import { Shield, Flag, Globe } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const BADGES = [
  { icon: Shield, label: "Conforme RGPD" },
  { icon: Flag, label: "Made in Portugal" },
  { icon: Globe, label: "Dados na UE" },
];

export function SocialProofBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-10 border-y border-slate-800/50 bg-slate-900/30">
      <div className="container mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12"
        >
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </motion.div>
        <p className="text-center text-xs text-slate-500 mt-4">
          Utilizado por clínicas, imobiliárias e empresas de serviços em Portugal
        </p>
      </div>
    </section>
  );
}
