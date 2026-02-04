import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, Shield, Calendar, FileText, ShoppingBag, Store, UserCheck, Mail, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useModules, EnabledModules } from "@/hooks/useModules";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  moduleKey?: keyof EnabledModules;
}

const allNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/clients", icon: UserCheck, label: "Clientes", moduleKey: 'clients' },
  { to: "/proposals", icon: FileText, label: "Propostas", moduleKey: 'proposals' },
  { to: "/sales", icon: ShoppingBag, label: "Vendas", moduleKey: 'sales' },
  { to: "/financeiro", icon: Wallet, label: "Finanças", moduleKey: 'finance' },
  { to: "/calendar", icon: Calendar, label: "Agenda", moduleKey: 'calendar' },
  { to: "/marketing", icon: Mail, label: "Marketing", moduleKey: 'marketing' },
  { to: "/ecommerce", icon: Store, label: "Loja", moduleKey: 'ecommerce' },
  { to: "/settings", icon: Settings, label: "Config" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { modules } = useModules();

  // Filter nav items based on enabled modules
  const navItems = allNavItems.filter(item => {
    if (!item.moduleKey) return true;
    return modules[item.moduleKey];
  });

  const allItems = isSuperAdmin 
    ? [...navItems, { to: "/system-admin", icon: Shield, label: "Admin" }]
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom overflow-hidden">
      <div className="flex items-center h-16 px-2 overflow-x-auto no-scrollbar gap-1">
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
