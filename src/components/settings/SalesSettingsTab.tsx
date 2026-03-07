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
  round_robin_index?: number;
}

export function SalesSettingsTab() {
  const { data: org } = useOrganization();
  const updateOrganization = useUpdateOrganization();

  const currentSettings: SalesSettings = (org?.sales_settings as SalesSettings) || {};

  const [lockDelivered, setLockDelivered] = useState(false);
  const [lockFulfilled, setLockFulfilled] = useState(false);
  const [preventDeletion, setPreventDeletion] = useState(false);
  const [autoAssign, setAutoAssign] = useState(false);

  useEffect(() => {
    setLockDelivered(!!currentSettings.lock_delivered_sales);
    setLockFulfilled(!!currentSettings.lock_fulfilled_sales);
    setPreventDeletion(!!currentSettings.prevent_payment_deletion);
    setAutoAssign(!!currentSettings.auto_assign_leads);
  }, [org?.sales_settings]);

  const handleSave = () => {
    updateOrganization.mutate({
      sales_settings: {
        lock_delivered_sales: lockDelivered,
        lock_fulfilled_sales: lockFulfilled,
        prevent_payment_deletion: preventDeletion,
        auto_assign_leads: autoAssign,
        round_robin_index: currentSettings.round_robin_index || 0,
      },
    });
  };

  const hasChanges =
    lockDelivered !== !!currentSettings.lock_delivered_sales ||
    lockFulfilled !== !!currentSettings.lock_fulfilled_sales ||
    preventDeletion !== !!currentSettings.prevent_payment_deletion ||
    autoAssign !== !!currentSettings.auto_assign_leads;

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
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="auto_assign" className="font-medium cursor-pointer">
                  Atribuição automática de leads
                </Label>
              </div>
              <Switch
                id="auto_assign"
                checked={autoAssign}
                onCheckedChange={setAutoAssign}
              />
            </div>
            <div className="mt-2 flex gap-2 p-3 rounded-md bg-muted/50 border">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quando ativo, os novos leads são distribuídos automaticamente entre os comerciais da equipa, por ordem sequencial (round-robin). 
                Exemplo: Se existem 5 comerciais, o 1.º lead vai para o comercial 1, o 2.º para o comercial 2, e assim por diante. 
                Quando todos receberem, o ciclo recomeça do primeiro.
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