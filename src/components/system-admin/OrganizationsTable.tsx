import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminTableSkeleton } from "@/components/system-admin/AdminShell";
import { classifyOrg, BUCKET_META, since, until, type OrgBucket } from "@/components/system-admin/orgStatus";

interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  billing_exempt: boolean | null;
  created_at: string | null;
  contact_phone: string | null;
  member_count: number;
  first_paid_at: string | null;
  payment_failed_at: string | null;
  last_active_at: string | null;
  extra_seats: number | null;
}

export interface OrgStripeData {
  org_id: string;
  stripe_plan: string | null;
  stripe_amount: number;
  stripe_status: string | null;
  stripe_period_end: string | null;
  has_stripe_subscription: boolean;
}

export interface AdminContact {
  name?: string;
  email?: string;
}

type Filter = "all" | "paying" | "trial" | "overdue" | "expired" | "exempt";
type SortKey = "name" | "activity" | "mrr" | "members" | "created";

interface OrganizationsTableProps {
  organizations: Organization[];
  loading?: boolean;
  currentOrgId?: string;
  onAccessOrg: (orgId: string) => void;
  stripeData?: OrgStripeData[];
  adminInfo?: Record<string, AdminContact>;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "paying", label: "Pagantes" },
  { key: "trial", label: "Trial" },
  { key: "overdue", label: "Em atraso" },
  { key: "expired", label: "Expirados" },
  { key: "exempt", label: "Isentos" },
];

function matchesFilter(status: OrgBucket, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "expired") return status === "expired" || status === "canceled";
  return status === filter;
}

const DORMANT_MS = 7 * 86400000;

function contextLine(status: OrgBucket, o: Organization, now: Date): string {
  switch (status) {
    case "paying": return o.first_paid_at ? `cliente há ${since(o.first_paid_at, now)}` : "ativo";
    case "trial": return o.trial_ends_at ? `faltam ${until(o.trial_ends_at, now)}` : "trial";
    case "overdue": return "pagamento falhou";
    case "expired": return o.trial_ends_at ? `expirou há ${since(o.trial_ends_at, now)}` : "expirado";
    case "canceled": return "cancelado";
    case "exempt": return "conta interna";
  }
}

export function OrganizationsTable({
  organizations,
  loading,
  currentOrgId,
  onAccessOrg,
  stripeData,
  adminInfo = {},
}: OrganizationsTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = new Date();

  const stripeMap = useMemo(() => {
    const m = new Map<string, OrgStripeData>();
    (stripeData || []).forEach((s) => m.set(s.org_id, s));
    return m;
  }, [stripeData]);

  // ⌘K / Ctrl+K (and "/") focus the search — the surface is search-first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = organizations.filter((org) => {
      const status = classifyOrg(org, stripeMap.get(org.id)?.stripe_status, now);
      if (!matchesFilter(status, filter)) return false;
      if (!q) return true;
      const c = adminInfo[org.id] || {};
      return (
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        (org.code || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (org.contact_phone || "").toLowerCase().includes(q)
      );
    });

    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      const activityTime = (o: Organization) => (o.last_active_at ? new Date(o.last_active_at).getTime() : -Infinity);
      const createdTime = (o: Organization) => (o.created_at ? new Date(o.created_at).getTime() : -Infinity);
      list = [...list].sort((a, b) => {
        switch (sort.key) {
          case "name": return a.name.localeCompare(b.name) * dir;
          case "members": return (a.member_count - b.member_count) * dir;
          case "mrr": return ((stripeMap.get(a.id)?.stripe_amount ?? 0) - (stripeMap.get(b.id)?.stripe_amount ?? 0)) * dir;
          case "activity": return (activityTime(a) - activityTime(b)) * dir;
          case "created": return (createdTime(a) - createdTime(b)) * dir;
          default: return 0;
        }
      });
    }
    return list;
  }, [organizations, filter, query, sort, stripeMap, adminInfo, now]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div className="space-y-3">
      {/* Search — the protagonist */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar empresa, responsável, código, email ou telefone…"
          className="h-11 w-full rounded-xl border bg-card pl-10 pr-16 text-sm outline-none ring-primary/30 transition focus:border-primary/40 focus:ring-2"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </div>

      {/* Filters + count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-auto flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key} className="text-xs">{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground tabular-nums">
          {loading ? "…" : `${rows.length} ${rows.length === 1 ? "empresa" : "empresas"}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <AdminTableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">Sem resultados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? <>Nada corresponde a “{query}”.</> : "Nenhuma empresa neste filtro."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Empresa" k="name" sort={sort} onSort={toggleSort} />
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Responsável</TableHead>
                  <SortHead label="Última atividade" k="activity" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
                  <SortHead label="€/mês" k="mrr" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" align="right" />
                  <TableHead className="hidden xl:table-cell text-right">Extra</TableHead>
                  <SortHead label="Membros" k="members" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" align="right" />
                  <SortHead label="Criada" k="created" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" align="right" />
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((org) => {
                  const stripeInfo = stripeMap.get(org.id);
                  const status = classifyOrg(org, stripeInfo?.stripe_status, now);
                  const meta = BUCKET_META[status];
                  const isCurrent = currentOrgId === org.id;
                  const contact = adminInfo[org.id] || {};
                  const lastMs = org.last_active_at ? now.getTime() - new Date(org.last_active_at).getTime() : null;
                  const dormant = lastMs === null || lastMs > DORMANT_MS;
                  const activityLabel = org.last_active_at
                    ? (lastMs !== null && lastMs < 3600000 ? "agora" : `há ${since(org.last_active_at, now)}`)
                    : "nunca";

                  return (
                    <TableRow
                      key={org.id}
                      onClick={() => onAccessOrg(org.id)}
                      title={`Aceder a ${org.name}`}
                      className={cn("group cursor-pointer", isCurrent && "bg-primary/5")}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="max-w-[200px] truncate">{org.name}</span>
                            {isCurrent && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">atual</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{org.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge className={cn("w-fit text-[10px]", meta.badge)}>{meta.label}</Badge>
                          <span className="text-[11px] text-muted-foreground">{contextLine(status, org, now)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex max-w-[220px] flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{contact.name || "—"}</span>
                          {contact.email && (
                            <span className="truncate text-[11px] text-muted-foreground" title={contact.email}>{contact.email}</span>
                          )}
                          {org.contact_phone && (
                            <span className="truncate text-[11px] text-emerald-600 dark:text-emerald-400" title={org.contact_phone}>
                              📱 {org.contact_phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={cn("inline-flex items-center gap-1.5 text-sm", dormant ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dormant ? "bg-amber-500" : "bg-emerald-500")} />
                          {activityLabel}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        {stripeInfo?.has_stripe_subscription ? (
                          <span className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">€{stripeInfo.stripe_amount}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right">
                        {org.extra_seats && org.extra_seats > 0 ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-medium text-cyan-600 dark:text-cyan-400">
                            +{org.extra_seats} ({org.extra_seats * 5}€)
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-sm tabular-nums">
                        {org.member_count}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right text-xs text-muted-foreground">
                        {org.created_at ? format(new Date(org.created_at), "dd MMM yy", { locale: pt }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function SortHead({
  label, k, sort, onSort, className, align,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (k: SortKey) => void;
  className?: string;
  align?: "right";
}) {
  const active = sort?.key === k;
  const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "ml-auto flex-row-reverse",
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}
