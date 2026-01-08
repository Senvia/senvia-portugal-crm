import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: (name: string) => void;
  organizationName?: string;
}

export const WelcomeStep = ({ onNext, organizationName }: WelcomeStepProps) => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNext(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <motion.h1 
          className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Olá! Sou a IA {organizationName ? `da ${organizationName}` : "do Senvia OS"}.
        </motion.h1>
        <motion.p 
          className="text-lg text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Vamos ver quantos leads está a perder hoje. Como se chama?
        </motion.p>
      </div>

      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Input
          type="text"
          placeholder="O seu nome..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-14 text-lg px-4 bg-background border-border"
          autoFocus
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: name.trim() ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            type="submit"
            disabled={!name.trim()}
            className="w-full h-12 text-base gap-2"
            variant="senvia"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </form>
  );
};
