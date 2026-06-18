import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOrganization, useUpdateOrganization } from "@/hooks/useOrganization";
import { ShoppingCart, Info } from "lucide-react";

interface SalesSettings {
  lock_delivered_sales?: boolean;
  lock_fulfilled_sales?: boolean;
  prevent_payment_deletion?: boolean;
  auto_assign_leads?: boolean;
  exclude_admins_from_assignment?: boolean;
  round_robin_index?: number;
  [key: string]: unknown;
}

export function SalesSettingsTab() {
  const { data: org } = useOrganization();
  const updateOrganization = useUpdateOrganization();

  const currentSettings: SalesSettings = (org?.sales_settings as SalesSettings) || {};

  const [lockDelivered, setLockDelivered] = useState(false);
  const [lockFulfilled, setLockFulfilled] = useState(false);
  const [preventDeletion, setPreventDeletion] = useState(false);

  useEffect(() => {
    setLockDelivered(!!currentSettings.lock_delivered_sales);
    setLockFulfilled(!!currentSettings.lock_fulfilled_sales);
    setPreventDeletion(!!currentSettings.prevent_payment_deletion);
  }, [org?.sales_settings]);

  const handleSave = () => {
    // Preserve fields owned by other tabs (e.g. commissions config lives in
    // the Matriz de Comissões tab) by spreading the current settings first.
    updateOrganization.mutate({
      sales_settings: {
        ...currentSettings,
        lock_delivered_sales: lockDelivered,
        lock_fulfilled_sales: lockFulfilled,
        prevent_payment_deletion: preventDeletion,
      },
    });
  };

  const hasChanges =
    lockDelivered !== !!currentSettings.lock_delivered_sales ||
    lockFulfilled !== !!currentSettings.lock_fulfilled_sales ||
    preventDeletion !== !!currentSettings.prevent_payment_deletion;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Regras de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="lock_delivered"
              checked={lockDelivered}
              onCheckedChange={(checked) => setLockDelivered(!!checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="lock_delivered" className="font-medium cursor-pointer">
                Bloquear edição de vendas concluídas
              </Label>
              <p className="text-xs text-muted-foreground">
                Vendas com estado "Concluída" não podem ser editadas por utilizadores sem perfil de administrador.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="lock_fulfilled"
              checked={lockFulfilled}
              onCheckedChange={(checked) => setLockFulfilled(!!checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="lock_fulfilled" className="font-medium cursor-pointer">
                Bloquear edição de vendas entregues
              </Label>
              <p className="text-xs text-muted-foreground">
                Vendas com estado "Entregue" não podem ser editadas por utilizadores sem perfil de administrador.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="prevent_deletion"
              checked={preventDeletion}
              onCheckedChange={(checked) => setPreventDeletion(!!checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="prevent_deletion" className="font-medium cursor-pointer">
                Impedir exclusão de pagamentos
              </Label>
              <p className="text-xs text-muted-foreground">
                Pagamentos registados não podem ser eliminados.
              </p>
            </div>
          </div>

          <div className="border-t pt-5">
            <Label className="font-medium">Atribuição de leads</Label>
            <div className="mt-2 flex gap-2 p-3 rounded-md bg-muted/50 border">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                A atribuição de leads é definida em cada formulário e webhook (Sem atribuição /
                Responsável fixo / Rotação entre colaboradores), e a das conversas em cada caixa de
                entrada. Não existe distribuição automática "geral" ao nível da organização: cada
                fonte decide para quem vão os seus leads.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateOrganization.isPending}
            className="w-full sm:w-auto"
          >
            {updateOrganization.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
