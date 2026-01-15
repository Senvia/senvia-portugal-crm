import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, Shield, Calendar, FileText, ShoppingBag, Store, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useModules, EnabledModules } from "@/hooks/useModules";
import { APP_VERSION } from "@/lib/constants";
import type { AppRole } from "@/types";
import senviaLogo from "@/assets/senvia-logo.png";

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
  { to: "/calendar", icon: Calendar, label: "Agenda", moduleKey: 'calendar' },
  { to: "/ecommerce", icon: Store, label: "E-commerce", moduleKey: 'ecommerce' },
  { to: "/settings", icon: Settings, label: "Configurações" },
];
const getRoleLabel = (roles: AppRole[]): string => {
  if (roles.includes('super_admin')) return 'Super Admin';
  if (roles.includes('admin')) return 'Administrador';
  if (roles.includes('viewer')) return 'Visualizador';
  return 'Membro';
};
interface AppSidebarProps {
  userName?: string;
  organizationName?: string;
}
export function AppSidebar({
  userName = "Utilizador",
  organizationName = "A Minha Empresa"
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, roles, isSuperAdmin } = useAuth();
  const { modules } = useModules();

  // Filter nav items based on enabled modules
  const navItems = allNavItems.filter(item => {
    if (!item.moduleKey) return true;
    return modules[item.moduleKey];
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  return <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <img alt="SENVIA" className="h-10 w-40 object-contain" src="/lovable-uploads/a73ec7d1-f1a3-458c-8d12-82bca71d2d34.png" />
        </div>

        {/* Organization Info */}
        <div className="border-b border-sidebar-border px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-sidebar-muted">
            Organização
          </p>
          <p className="mt-1 truncate font-semibold text-sidebar-foreground">
            {organizationName}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(item => {
          const isActive = location.pathname === item.to || item.to !== "/dashboard" && location.pathname.startsWith(item.to);
          return <NavLink key={item.to} to={item.to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>;
        })}
          
          {/* Super Admin Link */}
          {isSuperAdmin && <NavLink to="/system-admin" className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200", location.pathname.startsWith("/system-admin") ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
              <Shield className="h-5 w-5" />
              System Admin
            </NavLink>}
        </nav>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-foreground">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {userName}
              </p>
              <p className="text-xs text-sidebar-muted">{getRoleLabel(roles)}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" title="Terminar sessão">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="px-4 py-2 text-center">
          <span className="text-[10px] text-sidebar-muted/60">
            Senvia OS v{APP_VERSION}
          </span>
        </div>
      </div>
    </aside>;
}