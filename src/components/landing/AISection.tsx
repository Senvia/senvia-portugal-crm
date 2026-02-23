import { Brain, Flame, Thermometer, Snowflake, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const CLASSIFICATIONS = [
  { icon: Flame, label: "Quente", desc: "Interesse claro, orçamento indicado, urgência alta", color: "text-red-400", bg: "bg-red-500/10" },
  { icon: Thermometer, label: "Morno", desc: "Interesse moderado, precisa de mais informação", color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Snowflake, label: "Frio", desc: "Curioso, sem urgência, fase de pesquisa", color: "text-blue-400", bg: "bg-blue-500/10" },
];

export function AISection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-slate-900/50 border-y border-slate-800/50">
      <div className="container mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Conheça a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              IA do Senvia OS
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A inteligência artificial analisa cada lead automaticamente e atribui uma classificação de temperatura.
          </p>
        </motion.div>

        {/* Flow */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 justify-center mb-12">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-center">
              <p className="text-white font-medium">Lead preenche formulário</p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary hidden md:block" />
            <div className="w-6 h-6 text-primary md:hidden rotate-90"><ArrowRight className="w-6 h-6" /></div>
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-6 py-4 text-center">
              <p className="text-primary font-medium">🤖 IA analisa respostas</p>
            </div>
            <ArrowRight className="w-6 h-6 text-primary hidden md:block" />
            <div className="w-6 h-6 text-primary md:hidden rotate-90"><ArrowRight className="w-6 h-6" /></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-center">
              <p className="text-white font-medium">Classificação automática</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {CLASSIFICATIONS.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                className={`${c.bg} border border-slate-700/50 rounded-xl p-6 text-center`}
              >
                <c.icon className={`w-8 h-8 ${c.color} mx-auto mb-3`} />
                <h3 className={`text-lg font-bold ${c.color} mb-2`}>{c.label}</h3>
                <p className="text-slate-400 text-sm">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
