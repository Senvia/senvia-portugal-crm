import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFidelizationAlerts, type CpeWithClient } from '@/hooks/useFidelizationAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, AlertTriangle, Clock, ChevronRight, Loader2, XCircle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { RenewCpeModal } from '@/components/clients/RenewCpeModal';
import { SwitchComercializadorModal } from '@/components/clients/SwitchComercializadorModal';

function AlertCard({ cpe, variant, onRenew, onSwitch }: { 
  cpe: CpeWithClient; 
  variant: 'expired' | 'urgent' | 'upcoming';
  onRenew: (cpe: CpeWithClient) => void;
  onSwitch: (cpe: CpeWithClient) => void;
}) {
  const navigate = useNavigate();
  const bgClass = variant === 'expired' ? 'bg-destructive/5 border-destructive/20' 
    : variant === 'urgent' ? 'bg-destructive/5 border-destructive/20' 
    : 'bg-warning/5 border-warning/20';

  return (
    <div className={`p-2 rounded-md transition-colors border ${bgClass}`}>
      <button
        onClick={() => navigate(`/clients?highlight=${cpe.client_id}`)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{cpe.client_name}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {cpe.equipment_type} | {cpe.comercializador} | {format(new Date(cpe.fidelizacao_end), 'dd/MM/yyyy', { locale: pt })}
          {cpe.days_until_expiry <= 0 && (
            <span className="text-destructive font-medium ml-1">
              (expirado há {Math.abs(cpe.days_until_expiry)} dias)
            </span>
          )}
        </div>
      </button>
      <div className="flex gap-1.5 mt-2">
        <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={() => onRenew(cpe)}>
          <RefreshCw className="h-3 w-3" /> Renovar
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={() => onSwitch(cpe)}>
          <ArrowRightLeft className="h-3 w-3" /> Alterar
        </Button>
      </div>
    </div>
  );
}

export function FidelizationAlertsWidget() {
  const { data, isLoading } = useFidelizationAlerts();
  const { organization } = useAuth();
  const navigate = useNavigate();

  const [renewCpe, setRenewCpe] = useState<CpeWithClient | null>(null);
  const [switchCpe, setSwitchCpe] = useState<CpeWithClient | null>(null);

  const isTelecom = organization?.niche === 'telecom';
  const title = isTelecom ? 'CPE/CUI a Expirar' : 'Fidelizações a Expirar';

  if (isLoading) {
    return (
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { urgent = [], upcoming = [], expired = [] } = data || {};
  const totalAlerts = expired.length + urgent.length + upcoming.length;

  if (totalAlerts === 0) {
    return (
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sem alertas pendentes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {totalAlerts}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Expired Section */}
          {expired.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Expirados</span>
                <Badge variant="destructive" className="text-xs ml-auto">
                  {expired.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {expired.slice(0, 3).map((cpe) => (
                  <AlertCard key={cpe.id} cpe={cpe} variant="expired" onRenew={setRenewCpe} onSwitch={setSwitchCpe} />
                ))}
              </div>
            </div>
          )}

          {/* Urgent Section */}
          {urgent.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Urgente (7 dias)</span>
                <Badge variant="destructive" className="text-xs ml-auto">
                  {urgent.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {urgent.slice(0, 3).map((cpe) => (
                  <AlertCard key={cpe.id} cpe={cpe} variant="urgent" onRenew={setRenewCpe} onSwitch={setSwitchCpe} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Próximos 30 dias</span>
                <Badge variant="outline" className="text-xs ml-auto border-warning/50 text-warning">
                  {upcoming.length}
                </Badge>
              </div>
              {(expired.length + urgent.length) === 0 && (
                <div className="space-y-1.5">
                  {upcoming.slice(0, 3).map((cpe) => (
                    <AlertCard key={cpe.id} cpe={cpe} variant="upcoming" onRenew={setRenewCpe} onSwitch={setSwitchCpe} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View All Button */}
          {totalAlerts > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/clients')}
            >
              Ver todos ({totalAlerts})
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {renewCpe && (
        <RenewCpeModal
          cpeId={renewCpe.id}
          currentEnd={renewCpe.fidelizacao_end}
          open={!!renewCpe}
          onOpenChange={(open) => !open && setRenewCpe(null)}
        />
      )}

      {switchCpe && (
        <SwitchComercializadorModal
          cpeId={switchCpe.id}
          currentComercializador={switchCpe.comercializador}
          open={!!switchCpe}
          onOpenChange={(open) => !open && setSwitchCpe(null)}
        />
      )}
    </>
  );
}
