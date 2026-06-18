import { Outlet } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { PortalTotalLinkFiltersProvider } from "@/components/portal-total-link/PortalTotalLinkContext";
import { PortalTotalLinkLayout } from "@/components/portal-total-link/PortalTotalLinkLayout";
import { useAuth } from "@/contexts/AuthContext";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";

export default function PortalTotalLink() {
  const { organization, organizations, isSuperAdmin } = useAuth();

  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  if (!hasAccess) {
    return (
      <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LayoutGrid className="h-5 w-5 shrink-0 text-primary" />
            Portal Total Link
          </h1>
          <p className="text-sm text-muted-foreground">
            Este módulo está disponível apenas para membros com acesso ativo à Perfect2Gether.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PortalTotalLinkFiltersProvider>
      <PortalTotalLinkLayout>
        <Outlet />
      </PortalTotalLinkLayout>
    </PortalTotalLinkFiltersProvider>
  );
}
