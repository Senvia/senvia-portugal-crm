import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

interface AIAvatarProps {
  primaryColor?: string;
}

export const AIAvatar = ({ primaryColor }: AIAvatarProps) => {
  return (
    <motion.div
      className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      style={primaryColor ? { 
        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` 
      } : undefined}
    >
      <Bot className="h-8 w-8 text-primary-foreground" />
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ 
          rotate: [0, 15, -15, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Sparkles className="h-5 w-5 text-yellow-400" />
      </motion.div>
    </motion.div>
  );
};
