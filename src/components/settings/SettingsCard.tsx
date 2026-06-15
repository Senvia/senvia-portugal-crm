import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SettingsCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
  tint?: string;
  iconColor?: string;
}

export function SettingsCard({ icon: Icon, title, description, onClick, className, tint, iconColor }: SettingsCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border bg-card",
        "hover:shadow-md hover:border-current/20 cursor-pointer transition-all text-left group",
        className
      )}
    >
      <div className={cn("rounded-xl p-2.5 shrink-0", tint ?? "bg-primary/10")}>
        <Icon className={cn("h-5 w-5", iconColor ?? "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  );
}
