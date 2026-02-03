import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFidelizationAlerts } from '@/hooks/useFidelizationAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, AlertTriangle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export function FidelizationAlertsWidget() {
  const { data, isLoading } = useFidelizationAlerts();
  const { organization } = useAuth();
  const navigate = useNavigate();

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

  const { urgent = [], upcoming = [] } = data || {};
  const totalAlerts = urgent.length + upcoming.length;

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
            Sem expiração nos próximos 30 dias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                <button
                  key={cpe.id}
                  onClick={() => navigate(`/clients?highlight=${cpe.client_id}`)}
                  className="w-full text-left p-2 rounded-md bg-destructive/5 hover:bg-destructive/10 transition-colors border border-destructive/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{cpe.client_name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cpe.equipment_type} | {cpe.comercializador} | {format(new Date(cpe.fidelizacao_end), 'dd/MM/yyyy', { locale: pt })}
                  </div>
                </button>
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
            {urgent.length === 0 && (
              <div className="space-y-1.5">
                {upcoming.slice(0, 3).map((cpe) => (
                  <button
                    key={cpe.id}
                    onClick={() => navigate(`/clients?highlight=${cpe.client_id}`)}
                    className="w-full text-left p-2 rounded-md bg-warning/5 hover:bg-warning/10 transition-colors border border-warning/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{cpe.client_name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {cpe.equipment_type} | {cpe.comercializador} | {format(new Date(cpe.fidelizacao_end), 'dd/MM/yyyy', { locale: pt })}
                    </div>
                  </button>
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
  );
}
