import { motion } from "framer-motion";
import { ReactNode } from "react";

interface OptionCardProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected?: boolean;
}

export const OptionCard = ({ icon, label, onClick, selected }: OptionCardProps) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-3 p-4 rounded-xl
        border-2 transition-colors cursor-pointer
        w-full h-[100px] min-w-[100px]
        ${selected 
          ? "border-primary bg-primary/10" 
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
        }
      `}
    >
      <div className={`${selected ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <span className={`font-medium text-xs text-center leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
        {label}
      </span>
    </motion.button>
  );
};
