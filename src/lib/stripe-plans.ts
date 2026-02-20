export interface StripePlan {
  id: string;
  name: string;
  priceId: string;
  productId: string;
  priceMonthly: number;
  features: string[];
  highlighted?: boolean;
}

export const STRIPE_PLANS: StripePlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceId: "price_1T2uHzLWnA81DzXTHdexakfL",
    productId: "prod_U0wAc7Tuy8w6gA",
    priceMonthly: 49,
    features: [
      "CRM base (Leads + Clientes)",
      "Até 10 utilizadores",
      "2 formulários",
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
    features: [
      "Tudo do Starter +",
      "Módulo Marketing",
      "Integração WhatsApp",
      "Até 15 utilizadores",
      "5 formulários",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    priceId: "price_1T2uO5LWnA81DzXT1V2bp77s",
    productId: "prod_U0wG6doz0zgZFV",
    priceMonthly: 147,
    features: [
      "Tudo do Pro +",
      "Módulo Financeiro",
      "Módulo E-commerce",
      "Multi-organização",
      "Utilizadores ilimitados",
    ],
  },
];

export const getPlanById = (id: string) => STRIPE_PLANS.find((p) => p.id === id);
export const getPlanByProductId = (productId: string) => STRIPE_PLANS.find((p) => p.productId === productId);
