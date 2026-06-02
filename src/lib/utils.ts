import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Remove acentos para pesquisa accent-insensitive
export function normalizeString(str: string): string {
  return (str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Pesquisa de texto tolerante: accent-insensitive e por tokens fora de ordem.
 * Cada palavra da query precisa existir (como substring) em algum dos campos.
 * Ex.: matchesSearch("joao sauro", "Jo\u00e3o Silva Sauro") === true
 */
export function matchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const tokens = normalizeString(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  // Junta com espa\u00e7o para que um token n\u00e3o atravesse a fronteira entre campos
  const haystack = normalizeString(fields.filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}
