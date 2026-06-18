export interface StripePlan {
  id: string;
  name: string;
  priceId: string;
  productId: string;
  priceMonthly: number;
  description: string;
  features: string[];
  modules: string[];
  integrations: string[];
  limits: { users: string; forms: string; inboxes: string };
  highlighted?: boolean;
}

// Caixas de entrada são multicanal: cada caixa pode ligar WhatsApp, Instagram,
// Facebook (Messenger) ou Email, e todas as conversas chegam num só lugar.
export const INBOX_EXPLAINER =
  "Caixas de entrada multicanal: liga WhatsApp, Instagram, Facebook e Email e responde a tudo num só lugar.";

export const STRIPE_PLANS: StripePlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceId: "price_1T2uHzLWnA81DzXTHdexakfL",
    productId: "prod_U0wAc7Tuy8w6gA",
    priceMonthly: 49,
    description: "Ideal para começar a organizar os seus leads e clientes.",
    modules: [
      "CRM Base (Leads + Clientes)",
      "Calendário",
      "Propostas",
    ],
    integrations: ["Meta Pixels"],
    limits: { users: "Até 5", forms: "5 formulários", inboxes: "2 caixas de entrada" },
    features: [
      "CRM base (Leads + Clientes)",
      "Até 5 utilizadores",
      "5 formulários",
      "2 caixas de entrada (WhatsApp, Instagram, Facebook, Email)",
      "Calendário e propostas",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceId: "price_1T2uNiLWnA81DzXTMDKqXDEI",
    productId: "prod_U0wGoA4odOBHOZ",
    priceMonthly: 99,
    highlighted: true,
    description: "Para equipas que querem vender mais com automação.",
    modules: [
      "Tudo do Starter +",
      "Módulo Vendas + Comissões",
      "Módulo Marketing",
    ],
    integrations: ["WhatsApp", "Meta Pixels"],
    limits: { users: "Até 15", forms: "15 formulários", inboxes: "10 caixas de entrada" },
    features: [
      "Tudo do Starter +",
      "Módulo Vendas + Comissões",
      "Módulo Marketing",
      "Integração WhatsApp",
      "Até 15 utilizadores",
      "15 formulários",
      "10 caixas de entrada (WhatsApp, Instagram, Facebook, Email)",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    priceId: "price_1T2uO5LWnA81DzXT1V2bp77s",
    productId: "prod_U0wG6doz0zgZFV",
    priceMonthly: 147,
    description: "Controlo total do negócio, sem limites.",
    modules: [
      "Tudo do Pro +",
      "Módulo Financeiro",
      "Módulo E-commerce",
    ],
    integrations: ["WhatsApp", "Meta Pixels", "Faturação (KeyInvoice, InvoiceXpress)", "Pagamentos (Stripe)"],
    limits: { users: "Ilimitados", forms: "Ilimitados", inboxes: "Caixas ilimitadas" },
    features: [
      "Tudo do Pro +",
      "Módulo Financeiro",
      "Módulo E-commerce",
      "Utilizadores ilimitados",
      "Formulários ilimitados",
      "Caixas de entrada ilimitadas (WhatsApp, Instagram, Facebook, Email)",
    ],
  },
];

export const getPlanById = (id: string) => STRIPE_PLANS.find((p) => p.id === id);
export const getPlanByProductId = (productId: string) => STRIPE_PLANS.find((p) => p.productId === productId);
