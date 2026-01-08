import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";

interface SuccessScreenProps {
  userName: string;
}

export const SuccessScreen = ({ userName }: SuccessScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          delay: 0.2 
        }}
        className="relative"
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </motion.div>
        <motion.div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <MessageCircle className="h-4 w-4 text-white" />
        </motion.div>
      </motion.div>

      <motion.div 
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Enviado, {userName}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-sm">
          Verifique o seu WhatsApp em <span className="font-semibold text-green-500">10 segundos</span>.
        </p>
      </motion.div>

      <motion.div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex space-x-1">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          />
        </div>
        <span>A preparar a sua mensagem</span>
      </motion.div>
    </div>
  );
};
