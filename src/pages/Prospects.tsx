import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useProspects, useProspectSalespeople } from "@/hooks/useProspects";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import { mapProspectsForExport, exportToCsv, exportToExcel } from "@/lib/export";
import { getProspectSegment } from "@/lib/prospects/segment";
import { normalizeString } from "@/lib/utils";
import { ImportProspectsDialog } from "@/components/prospects/ImportProspectsDialog";
import { DistributeProspectsDialog } from "@/components/prospects/DistributeProspectsDialog";
import { Download, Loader2, Search, Upload, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const formatConsumption = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value);
};

const formatAssignedLabel = (name?: string | null) => name || "Não atribuído";

export default function Prospects() {
  const { organization, organizations, isSuperAdmin } = useAuth();
  const { data: prospects = [], isLoading } = useProspects();
  const { data: salespeople = [], isLoading: salespeopleLoading } = useProspectSalespeople();
  const [searchQuery, setSearchQuery] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("all");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);

  const isPerfect2Gether = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });
  const salespersonMap = useMemo(
    () => new Map(salespeople.map((salesperson) => [salesperson.user_id, salesperson.full_name])),
    [salespeople]
  );

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const query = normalizeString(searchQuery);
      const matchesSearch =
        !query ||
        normalizeString(prospect.company_name).includes(query) ||
        normalizeString(prospect.nif || "").includes(query) ||
        normalizeString(prospect.cpe || "").includes(query) ||
        normalizeString(prospect.email || "").includes(query) ||
        normalizeString(prospect.phone || "").includes(query);

      const matchesSalesperson =
        salespersonFilter === "all" ||
        (salespersonFilter === "unassigned" && !prospect.assigned_to) ||
        prospect.assigned_to === salespersonFilter;

      return matchesSearch && matchesSalesperson;
    });
  }, [prospects, salespersonFilter, searchQuery]);

  const totals = useMemo(() => {
    const assigned = prospects.filter((prospect) => !!prospect.assigned_to).length;
    const remaining = prospects.filter((prospect) => !prospect.assigned_to && !prospect.converted_to_lead).length;

    return {
      total: prospects.length,
      assigned,
      remaining,
    };
  }, [prospects]);

  const handleExportCsv = () => {
    exportToCsv(mapProspectsForExport(filteredProspects, salespersonMap), `prospects_${format(new Date(), "yyyy-MM-dd")}`);
    toast.success(`${filteredProspects.length} prospects exportados para CSV`);
  };

  const handleExportExcel = () => {
    exportToExcel(mapProspectsForExport(filteredProspects, salespersonMap), `prospects_${format(new Date(), "yyyy-MM-dd")}`);
    toast.success(`${filteredProspects.length} prospects exportados para Excel`);
  };

  if (!isPerfect2Gether) {
    return (
      <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
          <p className="text-muted-foreground">Este módulo está disponível apenas para membros com acesso ativo à Perfect2Gether.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
          <p className="text-muted-foreground">
            Importe prospects, distribua só pelos comerciais e converta automaticamente em leads.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totals.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Atribuídos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totals.assigned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Restantes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totals.remaining}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] xl:w-full xl:max-w-3xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Pesquisar empresa, NIF, CPE, email ou telefone"
                    className="pl-9"
                  />
                </div>

                <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os comerciais</SelectItem>
                    <SelectItem value="unassigned">Não atribuídos</SelectItem>
                    {salespeople.map((salesperson) => (
                      <SelectItem key={salesperson.user_id} value={salesperson.user_id}>
                        {salesperson.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleExportCsv} disabled={filteredProspects.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" onClick={handleExportExcel} disabled={filteredProspects.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <Button onClick={() => setIsDistributeOpen(true)} disabled={totals.remaining === 0 || salespeople.length === 0}>
                  <Users className="mr-2 h-4 w-4" />
                  Distribuir leads
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(isLoading || salespeopleLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{filteredProspects.length} resultados</span>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredProspects.map((prospect) => (
                <Card key={prospect.id} className="border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{prospect.company_name}</p>
                        <p className="text-sm text-muted-foreground">{prospect.nif || "Sem NIF"}</p>
                      </div>
                      <Badge variant={prospect.converted_to_lead ? "default" : "secondary"}>
                        {prospect.converted_to_lead ? "Convertido" : "Por distribuir"}
                      </Badge>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">CPE:</span> {prospect.cpe || "—"}</p>
                      <p><span className="font-medium text-foreground">Segmento:</span> {getProspectSegment(prospect) || "Sem segmento"}</p>
                      <p><span className="font-medium text-foreground">kWh/Ano:</span> {formatConsumption(prospect.annual_consumption_kwh)}</p>
                      <p><span className="font-medium text-foreground">Comercial:</span> {formatAssignedLabel(salespersonMap.get(prospect.assigned_to || ""))}</p>
                      <p><span className="font-medium text-foreground">Contacto:</span> {prospect.phone || prospect.email || "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>CPE</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>kWh/Ano</TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((prospect) => (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{prospect.company_name}</p>
                          <p className="text-xs text-muted-foreground">{prospect.segment || "Sem segmento"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{prospect.nif || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{prospect.cpe || "—"}</TableCell>
                      <TableCell>{prospect.phone || prospect.email || "—"}</TableCell>
                      <TableCell>{formatConsumption(prospect.annual_consumption_kwh)}</TableCell>
                      <TableCell>{formatAssignedLabel(salespersonMap.get(prospect.assigned_to || ""))}</TableCell>
                      <TableCell>
                        <Badge variant={prospect.converted_to_lead ? "default" : "secondary"}>
                          {prospect.converted_to_lead ? "Convertido" : "Por distribuir"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!isLoading && filteredProspects.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Ainda não existem prospects com estes filtros.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ImportProspectsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      <DistributeProspectsDialog
        open={isDistributeOpen}
        onOpenChange={setIsDistributeOpen}
        remainingCount={totals.remaining}
        salespeople={salespeople}
      />
    </>
  );
}
