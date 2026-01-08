import { motion } from "framer-motion";
import { Bot, Sparkles, ArrowRight, Stethoscope, HardHat, Home, Package } from "lucide-react";

interface ConversationalFormPreviewProps {
  primaryColor?: string;
  organizationName?: string;
}

export function ConversationalFormPreview({ 
  primaryColor = "#3B82F6", 
  organizationName 
}: ConversationalFormPreviewProps) {
  return (
    <div className="flex items-center justify-center rounded-2xl border bg-slate-50/50 dark:bg-card/50 p-6 min-h-[400px]">
      <div className="w-full max-w-sm">
        {/* Card Container */}
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 overflow-hidden">
          {/* Progress Bar */}
          <div className="px-5 pt-5">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: primaryColor, width: "25%" }}
                animate={{ width: ["25%", "50%", "25%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* AI Avatar */}
            <div className="flex justify-center mb-6">
              <motion.div
                className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` 
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Bot className="h-7 w-7 text-white" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                </motion.div>
              </motion.div>
            </div>

            {/* Question */}
            <motion.div 
              className="text-center space-y-2 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-lg font-semibold text-foreground leading-relaxed">
                Olá! Sou a IA {organizationName ? `da ${organizationName}` : ""}.
              </h3>
              <p className="text-sm text-muted-foreground">
                Qual é o seu tipo de negócio?
              </p>
            </motion.div>

            {/* Option Cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Stethoscope, label: "Clínica" },
                { icon: HardHat, label: "Construção" },
                { icon: Home, label: "Imobiliária" },
                { icon: Package, label: "Outro" },
              ].map((option, index) => (
                <motion.div
                  key={option.label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-border bg-background hover:border-primary/50 cursor-pointer transition-colors"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <option.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{option.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Next Button Hint */}
            <div className="mt-4 flex justify-center">
              <div 
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full opacity-50"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                <span>Clique para continuar</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          Powered by Senvia OS
        </p>
      </div>
    </div>
  );
}
