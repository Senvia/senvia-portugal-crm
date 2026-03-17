export type MetricView = "global" | "team";

export type TeamMetric = {
  name: string;
  objetivo: number;
  ativos: number;
  pendentes: number;
};

export type PortalMetric = {
  title: string;
  color: string;
  summary: {
    objetivo: number;
    ativos: number;
    pendentes: number;
  };
};

export const teamBreakdown: TeamMetric[] = [
  { name: "André Coelho", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Carla Caralinda", objetivo: 0, ativos: 67.49, pendentes: 637.48 },
  { name: "Carla Pereira", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Fernando Gama", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Jorge Henriques", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Marco Fernandes", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Nuno Miguel Campos Silva", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Parceiros", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Pedro Manuel Bento Martins", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Ricardo Cabral", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Sara Dias", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Sonia Dias", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Susana Carapito", objetivo: 0, ativos: 676.95, pendentes: 766.26 },
  { name: "Vanda Barata", objetivo: 0, ativos: 0, pendentes: 0 },
];

export const portalHomeMetrics: PortalMetric[] = [
  {
    title: "Angariados",
    color: "hsl(var(--primary))",
    summary: {
      objetivo: 90,
      ativos: 74,
      pendentes: 16,
    },
  },
  {
    title: "Adicionados",
    color: "hsl(var(--secondary-foreground))",
    summary: {
      objetivo: 44,
      ativos: 39,
      pendentes: 5,
    },
  },
  {
    title: "Fidelizados",
    color: "hsl(var(--accent-foreground))",
    summary: {
      objetivo: 28,
      ativos: 24,
      pendentes: 4,
    },
  },
  {
    title: "Residêncial",
    color: "hsl(var(--muted-foreground))",
    summary: {
      objetivo: 48,
      ativos: 41,
      pendentes: 7,
    },
  },
  {
    title: "Novos NIFs",
    color: "hsl(var(--foreground))",
    summary: {
      objetivo: 26,
      ativos: 21,
      pendentes: 5,
    },
  },
];
