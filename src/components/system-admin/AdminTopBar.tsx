import { useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeOrganization } from '@/hooks/useHomeOrganization';

/**
 * The way out of System Admin.
 *
 * These routes live outside AppLayout, so there is no sidebar and no other link
 * back into the CRM. Without this bar the only exit is the browser's back
 * button.
 */
export function AdminTopBar() {
  const navigate = useNavigate();
  const { organization, switchOrganization } = useAuth();
  const { home, isAtHome } = useHomeOrganization();
  const [switching, setSwitching] = useState(false);

  const goHome = async () => {
    if (!home) return;
    if (isAtHome) {
      navigate('/');
      return;
    }
    setSwitching(true);
    // switchOrganization reloads the page itself once the JWT is updated.
    await switchOrganization(home.organization_id);
  };

  return (
    <div className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Shield className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold tracking-tight">System Admin</span>
          {organization?.name && (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              · sessão em {organization.name}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <LayoutDashboard className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Ir para o CRM</span>
          </Button>
          {home && (
            <Button size="sm" onClick={goHome} disabled={switching}>
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <Building2 className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {switching ? 'A mudar...' : `Voltar a ${home.organization_name}`}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
