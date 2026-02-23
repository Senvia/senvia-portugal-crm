import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, ExternalLink } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const WHATSAPP_URL = "https://app.senvia.pt/c/empresa-teste";

export function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Cada minuto que passa, outro lead fica{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              sem resposta.
            </span>
          </h2>
          <p className="text-slate-400 mb-8">
            Comece hoje. Configure amanhã. Venda mais na próxima semana.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="senvia" size="xl" asChild>
              <Link to="/login">
                Começar Teste Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="xl"
              className="bg-[#25D366] hover:bg-[#22c55e] text-white"
              asChild
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 w-5 h-5" />
                Receber Mensagem de Teste
                <ExternalLink className="ml-2 w-4 h-4" />
              </a>
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            14 dias grátis · Sem compromisso · Sem cartão de crédito
          </p>
        </motion.div>
      </div>
    </section>
  );
}
