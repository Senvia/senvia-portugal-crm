import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useModules, type EnabledModules } from "@/hooks/useModules";

// A single setup task Otto guides. `module` gates it to an enabled module (null =
// always relevant). `kind`/`target` describe the action (see runSetupTask).
export interface OttoSetupTask {
  key: string;
  label: string;
  description: string;
  icon: "kanban" | "message" | "receipt" | "mail" | "bag" | "users" | "upload";
  module: keyof EnabledModules | null;
  done: boolean;
  kind: "tour" | "modal" | "chat" | "nav";
  target: string;
}

export interface OttoOnboardingStatus {
  loading: boolean;
  tasks: OttoSetupTask[];      // tasks for the org's ACTIVE modules
  steps: OttoSetupTask[];      // alias of tasks (back-compat for the progress panel)
  pending: OttoSetupTask[];    // tasks not yet done
  completed: boolean;          // every active-module task is configured
  dismissed: boolean;          // reserved; setup is driven purely by pending tasks
  showBadge: boolean;          // admin + something still pending
  progress: { done: number; total: number };
}

export function useOttoOnboarding(): OttoOnboardingStatus {
  const { organization } = useAuth();
  const { isAdmin } = usePermissions();
  const { modules } = useModules();
  const orgId = organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["otto-setup", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const [stagesRes, leadsRes, membersRes, productsRes, channelsRes, orgRes] = await Promise.all([
        supabase.from("pipeline_stages").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId!).eq("is_active", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("messaging_channels").select("id", { count: "exact", head: true }).eq("organization_id", orgId!).eq("status", "connected"),
        supabase.from("organizations").select("invoicexpress_api_key, keyinvoice_username, brevo_api_key").eq("id", orgId!).maybeSingle(),
      ]);
      const org = orgRes.data as any;
      return {
        stages: stagesRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        members: membersRes.count ?? 0,
        products: productsRes.count ?? 0,
        channels: channelsRes.count ?? 0,
        invoicing: !!(org?.invoicexpress_api_key || org?.keyinvoice_username),
        marketing: !!org?.brevo_api_key,
      };
    },
  });

  const c = data ?? { stages: 0, leads: 0, members: 0, products: 0, channels: 0, invoicing: false, marketing: false };

  // Every possible task; filtered below to the org's active modules.
  const all: OttoSetupTask[] = [
    { key: "pipeline", label: "Configurar o pipeline de vendas", description: "As etapas por onde passam os teus negócios.", icon: "kanban", module: null, done: c.stages > 0, kind: "tour", target: "setup_pipeline" },
    { key: "inbox", label: "Ligar um canal de mensagens", description: "Liga o WhatsApp para falar com clientes dentro do CRM.", icon: "message", module: "inbox", done: c.channels > 0, kind: "modal", target: "whatsapp" },
    { key: "finance", label: "Configurar a faturação", description: "InvoiceXpress ou KeyInvoice para emitires faturas.", icon: "receipt", module: "finance", done: c.invoicing, kind: "chat", target: "Quero configurar a faturação da minha empresa." },
    { key: "marketing", label: "Ligar o email marketing", description: "Liga o Brevo para campanhas e emails automáticos.", icon: "mail", module: "marketing", done: c.marketing, kind: "chat", target: "Quero ligar o Brevo para email marketing." },
    { key: "ecommerce", label: "Adicionar o primeiro produto", description: "Cria o teu catálogo para começares a vender.", icon: "bag", module: "ecommerce", done: c.products > 0, kind: "nav", target: "/ecommerce/products" },
    { key: "team", label: "Convidar a equipa", description: "Dá acesso aos teus colegas e define permissões.", icon: "users", module: null, done: c.members > 1, kind: "tour", target: "invite_member" },
    { key: "leads", label: "Importar os teus leads", description: "Traz os teus contactos para o CRM.", icon: "upload", module: null, done: c.leads > 0, kind: "tour", target: "import_leads" },
  ];

  const tasks = all.filter((t) => t.module === null || (modules as any)?.[t.module]);
  const pending = tasks.filter((t) => !t.done);

  return {
    loading: isLoading,
    tasks,
    steps: tasks,
    pending,
    completed: tasks.length > 0 && pending.length === 0,
    dismissed: false,
    showBadge: !!orgId && isAdmin && !isLoading && pending.length > 0,
    progress: { done: tasks.length - pending.length, total: tasks.length },
  };
}
