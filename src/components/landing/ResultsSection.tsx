import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const METRICS = [
  { value: "< 5 seg", label: "Tempo de resposta" },
  { value: "100%", label: "Leads atendidos" },
  { value: "0", label: "Leads perdidos" },
  { value: "24/7", label: "Sem pausas" },
];

export function ResultsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gradient-to-br from-slate-900 via-primary/5 to-slate-900 border-y border-slate-800/50">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
        >
          Resultados que falam por si
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-400 mb-12 max-w-lg mx-auto"
        >
          O Senvia nunca tira férias, nunca se esquece, nunca perde um lead.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">{m.value}</p>
              <p className="text-sm text-slate-400">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
