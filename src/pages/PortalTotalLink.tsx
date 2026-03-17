import { FormEvent, useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import { Building2, FileSearch, Lock, Phone, Search, Workflow } from "lucide-react";

const nifSchema = z.string().regex(/^\d{9}$/, "Introduza um NIF válido com 9 dígitos.");

const previewBlocks = [
  {
    title: "Cliente",
    icon: Building2,
    status: "Aguarda mapeamento",
    description: "Nome fiscal, morada, estado e dados base devolvidos pelo PHC CS.",
  },
  {
    title: "Contactos",
    icon: Phone,
    status: "Aguarda mapeamento",
    description: "Telefones, emails e contactos associados ao NIF consultado.",
  },
  {
    title: "Resumo documental",
    icon: FileSearch,
    status: "Aguarda mapeamento",
    description: "Blocos de leitura para documentos e indicadores relevantes do portal.",
  },
];

export default function PortalTotalLink() {
  const { organization, organizations, isSuperAdmin } = useAuth();
  const [nif, setNif] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastLookupNif, setLastLookupNif] = useState<string | null>(null);

  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedNif = nif.replace(/\D/g, "").slice(0, 9);
    const parsed = nifSchema.safeParse(normalizedNif);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "NIF inválido.");
      setLastLookupNif(null);
      return;
    }

    setError(null);
    setLastLookupNif(parsed.data);
  };

  if (!hasAccess) {
    return (
      <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portal Total Link</h1>
          <p className="text-muted-foreground">Este módulo está disponível apenas para membros com acesso ativo à Perfect2Gether.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Exclusivo Perfect2Gether</Badge>
          <Badge variant="outline">Read-only</Badge>
          <Badge variant="outline">Sem sync CRM</Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-2xl md:text-3xl">Portal Total Link</CardTitle>
                  <CardDescription>
                    Consulta isolada por NIF para pesquisa de dados no PHC CS, sem criar ou atualizar registos no Senvia OS.
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-3">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="portal-total-link-nif" className="text-sm font-medium text-foreground">
                    NIF do cliente
                  </label>
                  <Input
                    id="portal-total-link-nif"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ex.: 123456789"
                    value={nif}
                    onChange={(event) => {
                      setNif(event.target.value.replace(/\D/g, "").slice(0, 9));
                      if (error) setError(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "portal-total-link-nif-error" : undefined}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estrutura pronta para receber a ligação oficial ao PHC CS assim que os endpoints e autenticação forem fechados.
                  </p>
                  {error && (
                    <p id="portal-total-link-nif-error" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="submit" className="w-full sm:w-auto">
                    <Search className="h-4 w-4" />
                    Consultar
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Consulta protegida e isolada do CRM
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado da integração</CardTitle>
              <CardDescription>Fase 1 do portal preparada para a futura ligação ao PHC CS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">Ligação API</p>
                  <p>Aguardar documentação oficial, autenticação e endpoint de pesquisa por NIF.</p>
                </div>
                <Badge variant="outline">Pendente</Badge>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">Persistência</p>
                  <p>Nenhum dado consultado será gravado ou sincronizado no CRM nesta fase.</p>
                </div>
                <Badge variant="secondary">Desligada</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {previewBlocks.map((block) => {
          const Icon = block.icon;

          return (
            <Card key={block.title}>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl border border-border bg-muted/40 p-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Badge variant="outline">{block.status}</Badge>
                </div>
                <div>
                  <CardTitle className="text-lg">{block.title}</CardTitle>
                  <CardDescription>{block.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estrutura prevista da consulta</CardTitle>
          <CardDescription>
            O portal já está preparado para apresentar blocos normalizados quando a API oficial do PHC CS estiver disponível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bloco</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewBlocks.map((block) => (
                <TableRow key={block.title}>
                  <TableCell className="font-medium">{block.title}</TableCell>
                  <TableCell>PHC CS</TableCell>
                  <TableCell>{block.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {lastLookupNif && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pré-consulta preparada</CardTitle>
            <CardDescription>
              NIF validado: <span className="font-medium text-foreground">{lastLookupNif}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              A ligação real ao PHC CS será ativada na próxima fase, assim que forem confirmados os endpoints e a autenticação oficial.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
