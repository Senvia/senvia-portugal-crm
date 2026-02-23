import { Check, X, Minus } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type CellValue = "yes" | "no" | "partial" | string;

interface Row {
  label: string;
  senvia: CellValue;
  pipedrive: CellValue;
  hubspot: CellValue;
  excel: CellValue;
}

const ROWS: Row[] = [
  { label: "WhatsApp integrado", senvia: "yes", pipedrive: "no", hubspot: "partial", excel: "no" },
  { label: "IA incluída", senvia: "yes", pipedrive: "partial", hubspot: "partial", excel: "no" },
  { label: "Português (PT-PT)", senvia: "yes", pipedrive: "no", hubspot: "no", excel: "yes" },
  { label: "Suporte local", senvia: "yes", pipedrive: "no", hubspot: "no", excel: "no" },
  { label: "Setup guiado", senvia: "yes", pipedrive: "no", hubspot: "no", excel: "no" },
  { label: "Conforme RGPD", senvia: "yes", pipedrive: "yes", hubspot: "yes", excel: "no" },
  { label: "Preço desde", senvia: "49€/mês", pipedrive: "14€/user", hubspot: "Grátis*", excel: "0€" },
];

function CellIcon({ val }: { val: CellValue }) {
  if (val === "yes") return <Check className="w-5 h-5 text-green-400 mx-auto" />;
  if (val === "no") return <X className="w-5 h-5 text-red-400 mx-auto" />;
  if (val === "partial") return <Minus className="w-5 h-5 text-yellow-400 mx-auto" />;
  return <span className="text-slate-300 text-sm">{val}</span>;
}

export function ComparisonTable() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Senvia OS vs.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Alternativas
            </span>
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-3 text-slate-400 text-sm font-medium">Critério</th>
                <th className="py-4 px-3 text-primary font-bold text-sm">Senvia OS</th>
                <th className="py-4 px-3 text-slate-400 text-sm font-medium">Pipedrive</th>
                <th className="py-4 px-3 text-slate-400 text-sm font-medium">HubSpot</th>
                <th className="py-4 px-3 text-slate-400 text-sm font-medium">Excel + WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-slate-800/50">
                  <td className="py-3 px-3 text-slate-300 text-sm">{row.label}</td>
                  <td className="py-3 px-3 text-center bg-primary/5"><CellIcon val={row.senvia} /></td>
                  <td className="py-3 px-3 text-center"><CellIcon val={row.pipedrive} /></td>
                  <td className="py-3 px-3 text-center"><CellIcon val={row.hubspot} /></td>
                  <td className="py-3 px-3 text-center"><CellIcon val={row.excel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
