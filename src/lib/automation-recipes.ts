import type {
  AutomationGraph, AutomationTriggerType, AutomationNodeConfig,
} from '@/types/automations';

/**
 * Ready-made flows. Someone who has never built an automation picks one of
 * these, edits the message texts, and activates — which is the difference
 * between shipping an automation module and shipping a toolkit only a
 * developer can use.
 *
 * Every recipe is a complete, valid graph: the canvas lays it out
 * automatically, so no positions are stored here.
 */
export interface AutomationRecipe {
  id: string;
  name: string;
  /** One line, written from the customer's side: what this does for them. */
  summary: string;
  /** What the customer should change before activating. */
  editHint: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: AutomationNodeConfig;
  entry_node_id: string;
  graph: AutomationGraph;
  /** Rough shape shown on the card, e.g. "WhatsApp → espera → email". */
  outline: string[];
  conversational?: boolean;
}

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: 'boas-vindas-lead',
    name: 'Boas-vindas a novo lead',
    summary: 'Quem entra em contacto recebe uma mensagem em minutos, mesmo fora de horas.',
    editHint: 'Muda o texto da mensagem para as tuas palavras.',
    trigger_type: 'lead_created',
    entry_node_id: 'trigger',
    outline: ['Novo lead', 'Esperar 5 min', 'WhatsApp'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'lead_created', config: {}, position: { x: 0, y: 0 } },
        { id: 'wait', type: 'wait', config: { amount: 5, unit: 'minutes' }, position: { x: 0, y: 0 } },
        {
          id: 'whats', type: 'send_whatsapp',
          config: { message: 'Olá {{nome}}, obrigado pelo seu contacto! Em que posso ajudar?' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait', branch: null },
        { id: 'e2', source: 'wait', target: 'whats', branch: null },
      ],
    },
  },

  {
    id: 'qualificar-conversa',
    name: 'Qualificar lead por conversa',
    summary: 'Pergunta ao lead o que procura e encaminha-o conforme a resposta.',
    editHint: 'Ajusta a pergunta e as palavras que identificam cada resposta.',
    trigger_type: 'lead_created',
    entry_node_id: 'trigger',
    conversational: true,
    outline: ['Novo lead', 'Pergunta', 'Espera resposta', '2 caminhos'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'lead_created', config: {}, position: { x: 0, y: 0 } },
        {
          id: 'ask', type: 'send_whatsapp',
          config: {
            message: 'Olá {{nome}}! Para o ajudar melhor: procura uma solução para JÁ ou está só a comparar? Responda AGORA ou COMPARAR.',
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'wait', type: 'wait_reply',
          config: {
            timeout_amount: 24, timeout_unit: 'hours',
            rules: [
              { id: 'quente', keywords: ['agora', 'urgente', 'já', 'ja'], label: 'Quer já' },
              { id: 'frio', keywords: ['comparar', 'ver', 'depois', 'talvez'], label: 'A comparar' },
            ],
          },
          position: { x: 0, y: 0 },
        },
        { id: 'hot', type: 'move_stage', config: {}, position: { x: 0, y: 0 } },
        {
          id: 'warm', type: 'send_whatsapp',
          config: { message: 'Sem problema, {{nome}}. Envio-lhe a informação e fico disponível quando quiser avançar.' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'silent', type: 'send_whatsapp',
          config: { message: 'Olá {{nome}}, ainda posso ajudar com alguma coisa?' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'ask', branch: null },
        { id: 'e2', source: 'ask', target: 'wait', branch: null },
        { id: 'e3', source: 'wait', target: 'hot', branch: 'quente' },
        { id: 'e4', source: 'wait', target: 'warm', branch: 'frio' },
        { id: 'e5', source: 'wait', target: 'silent', branch: 'timeout' },
      ],
    },
  },

  {
    id: 'recuperar-lead-frio',
    name: 'Recuperar lead que não respondeu',
    summary: 'Três toques espaçados antes de dar o lead por perdido, em vez de o deixar cair.',
    editHint: 'Ajusta os textos e, se quiseres, os intervalos entre toques.',
    trigger_type: 'lead_created',
    entry_node_id: 'trigger',
    outline: ['Novo lead', 'Espera 2 dias', 'WhatsApp', 'Espera 3 dias', 'Email', 'Perdido'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'lead_created', config: {}, position: { x: 0, y: 0 } },
        { id: 'w1', type: 'wait', config: { amount: 2, unit: 'days' }, position: { x: 0, y: 0 } },
        {
          id: 'touch1', type: 'send_whatsapp',
          config: { message: 'Olá {{nome}}, ainda está interessado? Fico à disposição.' },
          position: { x: 0, y: 0 },
        },
        { id: 'w2', type: 'wait', config: { amount: 3, unit: 'days' }, position: { x: 0, y: 0 } },
        {
          id: 'touch2', type: 'send_email',
          config: { subject: '{{nome}}, ainda posso ajudar?', html: '<p>Olá {{nome}},</p><p>Passei por aqui para saber se ainda faz sentido falarmos.</p>' },
          position: { x: 0, y: 0 },
        },
        { id: 'w3', type: 'wait', config: { amount: 5, unit: 'days' }, position: { x: 0, y: 0 } },
        { id: 'lost', type: 'end', config: { reason: 'Sem resposta após 3 tentativas' }, position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'w1', branch: null },
        { id: 'e2', source: 'w1', target: 'touch1', branch: null },
        { id: 'e3', source: 'touch1', target: 'w2', branch: null },
        { id: 'e4', source: 'w2', target: 'touch2', branch: null },
        { id: 'e5', source: 'touch2', target: 'w3', branch: null },
        { id: 'e6', source: 'w3', target: 'lost', branch: null },
      ],
    },
  },

  {
    id: 'palavra-chave-campanha',
    name: 'Palavra-chave da campanha',
    summary: 'Quem escrever a palavra do anúncio entra automaticamente e recebe a oferta.',
    editHint: 'Define a palavra-chave no gatilho e escreve a mensagem da oferta.',
    trigger_type: 'whatsapp_keyword',
    trigger_config: { keywords: ['PROMO'] },
    entry_node_id: 'trigger',
    conversational: true,
    outline: ['Palavra-chave', 'WhatsApp', 'Espera resposta'],
    graph: {
      nodes: [
        {
          id: 'trigger', type: 'whatsapp_keyword',
          config: { keywords: ['PROMO'] }, position: { x: 0, y: 0 },
        },
        {
          id: 'offer', type: 'send_whatsapp',
          config: { message: 'Boa! Aqui está a sua oferta. Quer que lhe ligue para explicar? Responda SIM.' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'wait', type: 'wait_reply',
          config: {
            timeout_amount: 48, timeout_unit: 'hours',
            rules: [{ id: 'sim', keywords: ['sim', 'quero', 'ligue'], label: 'Quer contacto' }],
          },
          position: { x: 0, y: 0 },
        },
        { id: 'task', type: 'create_task', config: { title: 'Ligar ao contacto da campanha' }, position: { x: 0, y: 0 } },
        { id: 'done', type: 'end', config: { reason: 'Não pediu contacto' }, position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'offer', branch: null },
        { id: 'e2', source: 'offer', target: 'wait', branch: null },
        { id: 'e3', source: 'wait', target: 'task', branch: 'sim' },
        { id: 'e4', source: 'wait', target: 'done', branch: 'timeout' },
      ],
    },
  },

  {
    id: 'lead-ganho-onboarding',
    name: 'Lead ganho — dar as boas-vindas',
    summary: 'Assim que fechas negócio, o novo cliente recebe as boas-vindas e fica com tarefa aberta para o acompanhares.',
    editHint: 'Escolhe no gatilho a etapa que significa "ganho" no teu pipeline.',
    trigger_type: 'lead_status_changed',
    entry_node_id: 'trigger',
    outline: ['Lead muda de etapa', 'WhatsApp', 'Tarefa'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'lead_status_changed', config: {}, position: { x: 0, y: 0 } },
        {
          id: 'welcome', type: 'send_whatsapp',
          config: { message: 'Bem-vindo, {{nome}}! É um prazer tê-lo connosco. Vou acompanhá-lo nos primeiros passos.' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'task', type: 'create_task',
          config: { title: 'Acompanhar novo cliente {{nome}}' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'welcome', branch: null },
        { id: 'e2', source: 'welcome', target: 'task', branch: null },
      ],
    },
  },
];

export function getRecipe(id: string): AutomationRecipe | undefined {
  return AUTOMATION_RECIPES.find((r) => r.id === id);
}
