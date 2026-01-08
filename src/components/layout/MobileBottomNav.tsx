import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/settings", icon: Settings, label: "Config" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  const allItems = isSuperAdmin 
    ? [...navItems, { to: "/system-admin", icon: Shield, label: "Admin" }]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {allItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
