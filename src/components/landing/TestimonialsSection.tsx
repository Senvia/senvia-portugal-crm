import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TESTIMONIALS = [
  {
    quote: "Antes perdíamos metade dos pedidos do site. Agora todos são atendidos em segundos. A diferença no faturamento foi imediata.",
    name: "Dr. João Silva",
    role: "Diretor Clínico",
    company: "Clínica Dentária Sorriso",
    initials: "JS",
  },
  {
    quote: "Os leads do Idealista ficavam horas sem resposta. Com o Senvia, o contacto é imediato e a nossa taxa de conversão triplicou.",
    name: "Ana Costa",
    role: "Diretora Comercial",
    company: "Prime Imobiliária",
    initials: "AC",
  },
  {
    quote: "Recebemos pedidos de orçamento a qualquer hora. O Senvia responde por nós e organiza tudo para a equipa. Fantástico.",
    name: "Pedro Santos",
    role: "CEO",
    company: "Construsol Obras",
    initials: "PS",
  },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            O que dizem os nossos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              clientes
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 h-full">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{t.name}</p>
                      <p className="text-slate-500 text-xs">{t.role} · {t.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
