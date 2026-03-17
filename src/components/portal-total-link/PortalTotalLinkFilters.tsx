import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RotateCcw, Search } from "lucide-react";
import { usePortalTotalLinkFilters } from "./PortalTotalLinkContext";
import {
  portalTotalLinkBoStatusOptions,
  portalTotalLinkCommercialStatusOptions,
  portalTotalLinkCycleOptions,
  portalTotalLinkYearOptions,
} from "./portalTotalLinkConfig";

export function PortalTotalLinkFilters() {
  const { filters, setFilter, resetFilters, activeFilterCount } = usePortalTotalLinkFilters();

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Filtros de pesquisa</CardTitle>
            <CardDescription>
              Período, cliente, contrato, vendedor, ciclo, ano, estado comercial e estado BO.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Filter className="h-3.5 w-3.5" />
              {activeFilterCount} ativo{activeFilterCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <label htmlFor="portal-total-link-periodo" className="text-sm font-medium text-foreground">
              Período
            </label>
            <div id="portal-total-link-periodo">
              <DateRangePicker
                value={filters.period}
                onChange={(range) => setFilter("period", range)}
                placeholder="Selecionar período"
                className="h-12 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-cliente" className="text-sm font-medium text-foreground">
              Cliente
            </label>
            <Input
              id="portal-total-link-cliente"
              value={filters.clientQuery}
              onChange={(event) => setFilter("clientQuery", event.target.value)}
              placeholder="NIF ou nome"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-contrato" className="text-sm font-medium text-foreground">
              Contrato
            </label>
            <Input
              id="portal-total-link-contrato"
              value={filters.contractQuery}
              onChange={(event) => setFilter("contractQuery", event.target.value)}
              placeholder="Número ou referência"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-vendedor" className="text-sm font-medium text-foreground">
              Vendedor
            </label>
            <Input
              id="portal-total-link-vendedor"
              value={filters.sellerQuery}
              onChange={(event) => setFilter("sellerQuery", event.target.value)}
              placeholder="Nome do vendedor"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-ciclo" className="text-sm font-medium text-foreground">
              Ciclo
            </label>
            <Select value={filters.cycle} onValueChange={(value) => setFilter("cycle", value)}>
              <SelectTrigger id="portal-total-link-ciclo" className="h-12">
                <SelectValue placeholder="Todos os ciclos" />
              </SelectTrigger>
              <SelectContent>
                {portalTotalLinkCycleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-ano" className="text-sm font-medium text-foreground">
              Ano
            </label>
            <Select value={filters.year} onValueChange={(value) => setFilter("year", value)}>
              <SelectTrigger id="portal-total-link-ano" className="h-12">
                <SelectValue placeholder="Todos os anos" />
              </SelectTrigger>
              <SelectContent>
                {portalTotalLinkYearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-estado-comercial" className="text-sm font-medium text-foreground">
              Estado comercial
            </label>
            <Select
              value={filters.commercialStatus}
              onValueChange={(value) => setFilter("commercialStatus", value)}
            >
              <SelectTrigger id="portal-total-link-estado-comercial" className="h-12">
                <SelectValue placeholder="Todos os estados comerciais" />
              </SelectTrigger>
              <SelectContent>
                {portalTotalLinkCommercialStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="portal-total-link-estado-bo" className="text-sm font-medium text-foreground">
              Estado BO
            </label>
            <Select value={filters.boStatus} onValueChange={(value) => setFilter("boStatus", value)}>
              <SelectTrigger id="portal-total-link-estado-bo" className="h-12">
                <SelectValue placeholder="Todos os estados BO" />
              </SelectTrigger>
              <SelectContent>
                {portalTotalLinkBoStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            A pesquisa por cliente e vendedor está preparada para ignorar acentos quando a listagem real for ligada.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Limpar
            </Button>
            <Button type="button" className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              Pesquisar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
