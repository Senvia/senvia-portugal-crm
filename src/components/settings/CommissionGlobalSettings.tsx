import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info, Percent } from "lucide-react";
import { useOrganization, useUpdateOrganization } from "@/hooks/useOrganization";

interface SalesSettings {
  commissions_enabled?: boolean;
  commission_percentage?: number | null;
  [key: string]: unknown;
}

/**
 * Org-wide commission settings (enable + global %). Lives at the top of the
 * Matriz de Comissões tab because it's a commission rule, not a sales
 * workflow rule. Persists in `organizations.sales_settings` (same column as
 * before) — UI moved, data unchanged.
 */
export function CommissionGlobalSettings() {
  const { data: org } = useOrganization();
  const updateOrganization = useUpdateOrganization();
  const currentSettings: SalesSettings = (org?.sales_settings as SalesSettings) || {};

  const [enabled, setEnabled] = useState(false);
  const [percentage, setPercentage] = useState("");

  useEffect(() => {
    setEnabled(!!currentSettings.commissions_enabled);
    setPercentage(
      currentSettings.commission_percentage != null && currentSettings.commission_percentage > 0
        ? String(currentSettings.commission_percentage)
        : ""
    );
  }, [org?.sales_settings]);

  const parsedPct = percentage ? parseFloat(percentage) : null;
  const currentPct = currentSettings.commission_percentage != null && currentSettings.commission_percentage > 0
    ? currentSettings.commission_percentage
    : null;

  const hasChanges =
    enabled !== !!currentSettings.commissions_enabled ||
    (parsedPct || null) !== (currentPct || null);

  const handleSave = () => {
    updateOrganization.mutate({
      sales_settings: {
        ...currentSettings,
        commissions_enabled: enabled,
        commission_percentage: parsedPct && parsedPct > 0 ? parsedPct : null,
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Regras gerais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="commissions_enabled_matrix" className="font-medium cursor-pointer">
              Comissões sobre vendas
            </Label>
            <p className="text-xs text-muted-foreground">
              Liga o cálculo de comissões nesta organização.
            </p>
          </div>
          <Switch
            id="commissions_enabled_matrix"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-3 border-t pt-5">
            <div className="space-y-2">
              <Label htmlFor="commission_percentage_matrix" className="text-sm">
                Percentagem global (%)
              </Label>
              <Input
                id="commission_percentage_matrix"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Ex: 10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex gap-2 p-3 rounded-md bg-muted/50 border">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aplicada como <strong>fallback</strong> sobre o valor total da venda quando
                os produtos não têm comissão configurada. Para regras detalhadas por produto
                ou energia, usa as secções abaixo. Se preferes definir a percentagem
                individualmente por colaborador, deixa este campo vazio e configura em
                Equipa &gt; Editar Dados.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateOrganization.isPending}
          className="w-full sm:w-auto"
        >
          {updateOrganization.isPending ? "A guardar..." : "Guardar"}
        </Button>
      </CardContent>
    </Card>
  );
}
