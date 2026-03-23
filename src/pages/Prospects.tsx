import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useProspects, useProspectSalespeople } from "@/hooks/useProspects";
import { useModules } from "@/hooks/useModules";
import { mapProspectsForExport, exportToCsv, exportToExcel } from "@/lib/export";
import { getProspectCom, getProspectSegment } from "@/lib/prospects/segment";
import { normalizeString } from "@/lib/utils";
import { isPerfect2GetherOrg } from "@/lib/perfect2gether";
import { ImportProspectsDialog } from "@/components/prospects/ImportProspectsDialog";
import { DistributeProspectsDialog } from "@/components/prospects/DistributeProspectsDialog";
import { GenerateProspectsDialog } from "@/components/prospects/GenerateProspectsDialog";
import { Download, Loader2, Search, Upload, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const formatConsumption = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value);
};

const formatAssignedLabel = (name?: string | null) => name || "Não atribuído";
const isProspectEligibleForDistribution = (prospect: { assigned_to: string | null; converted_to_lead: boolean }) =>
  !prospect.assigned_to && !prospect.converted_to_lead;

export default function Prospects() {
  const { organization } = useAuth();
  const { modules } = useModules();
  const { data: prospects = [], isLoading } = useProspects();
  const { data: salespeople = [], isLoading: salespeopleLoading } = useProspectSalespeople();
  const [searchQuery, setSearchQuery] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("all");
  const [comFilter, setComFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const isP2G = isPerfect2GetherOrg(organization?.id);
  const salespersonMap = useMemo(
    () => new Map(salespeople.map((salesperson) => [salesperson.user_id, salesperson.full_name])),
    [salespeople]
  );
  const comOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        prospects
          .map((prospect) => getProspectCom(prospect))
          .filter((value): value is string => Boolean(value))
      )
    );

    return values.sort((a, b) => a.localeCompare(b, "pt-PT"));
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const query = normalizeString(searchQuery);
      const prospectCom = getProspectCom(prospect);
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

      const matchesCom = comFilter === "all" || prospectCom === comFilter;

      return matchesSearch && matchesSalesperson && matchesCom;
    });
  }, [comFilter, prospects, salespersonFilter, searchQuery]);

  const eligibleFilteredProspects = useMemo(
    () => filteredProspects.filter(isProspectEligibleForDistribution),
    [filteredProspects]
  );
  const eligibleFilteredIds = useMemo(
    () => eligibleFilteredProspects.map((prospect) => prospect.id),
    [eligibleFilteredProspects]
  );
  const selectedEligibleIds = useMemo(
    () => selectedIds.filter((id) => eligibleFilteredIds.includes(id)),
    [eligibleFilteredIds, selectedIds]
  );
  const allEligibleFilteredSelected = eligibleFilteredIds.length > 0 && selectedEligibleIds.length === eligibleFilteredIds.length;

  useEffect(() => {
    setSelectedIds([]);
  }, [searchQuery, salespersonFilter, comFilter]);

  const totals = useMemo(() => {
    const assigned = prospects.filter((prospect) => !!prospect.assigned_to).length;
    const remaining = prospects.filter((prospect) => !prospect.assigned_to && !prospect.converted_to_lead).length;

    return {
      total: prospects.length,
      assigned,
      remaining,
    };
  }, [prospects]);

  const handleToggleProspect = (prospectId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(prospectId) ? current : [...current, prospectId];
      }

      return current.filter((id) => id !== prospectId);
    });
  };

  const handleToggleAllEligible = (checked: boolean) => {
    setSelectedIds((current) => {
      if (!checked) {
        return current.filter((id) => !eligibleFilteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...eligibleFilteredIds]));
    });
  };

  const handleExportCsv = () => {
    exportToCsv(mapProspectsForExport(filteredProspects, salespersonMap), `prospects_${format(new Date(), "yyyy-MM-dd")}`);
    toast.success(`${filteredProspects.length} prospects exportados para CSV`);
  };

  const handleExportExcel = () => {
    exportToExcel(mapProspectsForExport(filteredProspects, salespersonMap), `prospects_${format(new Date(), "yyyy-MM-dd")}`);
    toast.success(`${filteredProspects.length} prospects exportados para Excel`);
  };

  if (!modules.prospects) {
    return (
      <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
          <p className="text-muted-foreground">Ative o módulo Prospects nas Definições → Módulos para utilizar esta funcionalidade.</p>
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

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {isP2G ? (
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Prospects
            </Button>
          )}
          <Button variant="outline" onClick={handleExportCsv} disabled={filteredProspects.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={filteredProspects.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4 md:p-6">
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Pesquisar empresa, NIF, CPE, email ou telefone"
                  className="pl-9"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
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

                <Select value={comFilter} onValueChange={setComFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por COM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os COM</SelectItem>
                    {comOptions.map((com) => (
                      <SelectItem key={com} value={com}>
                        {com}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setIsDistributeOpen(true)}
                  disabled={selectedEligibleIds.length === 0 || salespeople.length === 0}
                  className="w-full md:w-auto"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Distribuir leads{selectedEligibleIds.length ? ` (${selectedEligibleIds.length})` : ""}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(isLoading || salespeopleLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{filteredProspects.length} resultados</span>
              {eligibleFilteredIds.length > 0 ? <span>• {selectedEligibleIds.length} selecionados</span> : null}
            </div>

            <div className="space-y-3 md:hidden">
              {eligibleFilteredIds.length > 0 ? (
                <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
                  <Checkbox
                    checked={allEligibleFilteredSelected}
                    onCheckedChange={(checked) => handleToggleAllEligible(checked === true)}
                    aria-label="Selecionar todos os prospects elegíveis filtrados"
                  />
                  <div>
                    <p className="text-sm font-medium">Selecionar todos os elegíveis</p>
                    <p className="text-xs text-muted-foreground">{eligibleFilteredIds.length} disponíveis nesta vista</p>
                  </div>
                </div>
              ) : null}

              {filteredProspects.map((prospect) => {
                const isEligible = isProspectEligibleForDistribution(prospect);
                const isSelected = selectedIds.includes(prospect.id);

                return (
                  <Card key={prospect.id} className="border-border/70">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            disabled={!isEligible}
                            onCheckedChange={(checked) => handleToggleProspect(prospect.id, checked === true)}
                            aria-label={`Selecionar prospect ${prospect.company_name}`}
                          />
                          <div>
                            <p className="font-medium">{prospect.company_name}</p>
                            <p className="text-sm text-muted-foreground">{prospect.nif || "Sem NIF"}</p>
                          </div>
                        </div>
                        <Badge variant={prospect.converted_to_lead ? "default" : "secondary"}>
                          {prospect.converted_to_lead ? "Convertido" : prospect.assigned_to ? "Atribuído" : "Por distribuir"}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">CPE:</span> {prospect.cpe || "—"}</p>
                        <p><span className="font-medium text-foreground">Segmento:</span> {getProspectSegment(prospect) || "—"}</p>
                        <p><span className="font-medium text-foreground">COM:</span> {getProspectCom(prospect) || "—"}</p>
                        <p><span className="font-medium text-foreground">kWh/Ano:</span> {formatConsumption(prospect.annual_consumption_kwh)}</p>
                        <p><span className="font-medium text-foreground">Comercial:</span> {formatAssignedLabel(salespersonMap.get(prospect.assigned_to || ""))}</p>
                        <p><span className="font-medium text-foreground">Contacto:</span> {prospect.phone || prospect.email || "—"}</p>
                        {!isEligible ? (
                          <p className="text-xs text-muted-foreground">Este prospect já foi atribuído ou convertido.</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={allEligibleFilteredSelected}
                        disabled={eligibleFilteredIds.length === 0}
                        onCheckedChange={(checked) => handleToggleAllEligible(checked === true)}
                        aria-label="Selecionar todos os prospects elegíveis filtrados"
                      />
                    </TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>CPE</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>COM</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>kWh/Ano</TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((prospect) => {
                    const isEligible = isProspectEligibleForDistribution(prospect);
                    const isSelected = selectedIds.includes(prospect.id);

                    return (
                      <TableRow key={prospect.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            disabled={!isEligible}
                            onCheckedChange={(checked) => handleToggleProspect(prospect.id, checked === true)}
                            aria-label={`Selecionar prospect ${prospect.company_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{prospect.company_name}</TableCell>
                        <TableCell>{prospect.nif || "—"}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{prospect.cpe || "—"}</TableCell>
                        <TableCell>{getProspectSegment(prospect) || "—"}</TableCell>
                        <TableCell>{getProspectCom(prospect) || "—"}</TableCell>
                        <TableCell>{prospect.phone || prospect.email || "—"}</TableCell>
                        <TableCell>{formatConsumption(prospect.annual_consumption_kwh)}</TableCell>
                        <TableCell>{formatAssignedLabel(salespersonMap.get(prospect.assigned_to || ""))}</TableCell>
                        <TableCell>
                          <Badge variant={prospect.converted_to_lead ? "default" : "secondary"}>
                            {prospect.converted_to_lead ? "Convertido" : prospect.assigned_to ? "Atribuído" : "Por distribuir"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {isP2G && <ImportProspectsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />}
      {!isP2G && organization?.id && (
        <GenerateProspectsDialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen} organizationId={organization.id} />
      )}
      <DistributeProspectsDialog
        open={isDistributeOpen}
        onOpenChange={setIsDistributeOpen}
        selectedCount={selectedEligibleIds.length}
        selectedIds={selectedEligibleIds}
        salespeople={salespeople}
        onDistributed={() => setSelectedIds([])}
      />
    </>
  );
}
