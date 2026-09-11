import { z } from 'zod';

export const ottoSubmission = z.object({
  input: z.string().trim().min(1, 'Escreva uma mensagem para o Otto.').max(8000, 'A mensagem pode ter no máximo 8000 caracteres.'),
  attachmentCount: z.number().int().min(0).max(5, 'Envie no máximo 5 anexos de cada vez.'),
});

interface ChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export function buildOttoHistory(history: readonly ChatMessage[], input: string): ChatMessage[] {
  const messages: ChatMessage[] = [
    ...history.filter(message => message.content.trim()).slice(-39).map(message => ({ role: message.role, content: message.content.slice(-8000) })),
    { role: 'user', content: input },
  ];
  // Reserve 4 KiB for the organization and up to five attachment paths.
  while (messages.length > 1 && new TextEncoder().encode(JSON.stringify(messages)).byteLength > 60 * 1024) messages.shift();
  return messages;
}

export const prospectSubmission = z.object({
  searchStrings: z.array(z.string().trim().min(1).max(150, 'Cada termo pode ter no máximo 150 caracteres.')).max(3, 'Use no máximo 3 termos de pesquisa.'),
  startUrls: z.array(z.string().url('Indique URLs válidas do Google Maps.').max(2048).refine(value => {
    const parsed = URL.canParse(value) ? new URL(value) : null;
    return parsed?.protocol === 'https:' && ['www.google.com', 'maps.google.com'].includes(parsed.hostname) && !parsed.username && !parsed.password && !parsed.port;
  }, 'Use URLs HTTPS de www.google.com ou maps.google.com.')).max(3, 'Use no máximo 3 URLs do Google Maps.'),
  location: z.string().max(200, 'A localização pode ter no máximo 200 caracteres.'),
  maxResults: z.number().int('Use um número inteiro de resultados.').min(1).max(50, 'O máximo é 50 resultados por termo.'),
  maxQuestions: z.number().int().min(0).max(10, 'O máximo é 10 perguntas.'),
  maximumLeadsEnrichmentRecords: z.number().int().min(0).max(50, 'O máximo é 50 registos de enriquecimento.'),
});
