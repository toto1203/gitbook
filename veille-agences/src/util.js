// Fonctions utilitaires pures, partagées par les plateformes et l'agrégation.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Délai aléatoire uniforme entre min et max (ms) : politesse envers les sites. */
export function randomDelay({ minMs = 4000, maxMs = 9000 } = {}) {
  const lo = Math.max(0, Math.min(minMs, maxMs));
  const hi = Math.max(minMs, maxMs);
  return sleep(lo + Math.random() * (hi - lo));
}

/**
 * Normalise un nom d'agence pour le regroupement : minuscules, sans accents,
 * sans ponctuation, espaces réduits. "L'Agence  du Parc - Lyon" -> "l agence du parc lyon".
 */
export function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Parcourt récursivement un objet JSON et appelle visit(node) sur chaque objet rencontré.
 * Sert de filet de sécurité quand le chemin exact dans le JSON embarqué a changé.
 */
export function walk(root, visit, maxDepth = 40) {
  const seen = new Set();
  const stack = [[root, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    if (!node || typeof node !== 'object' || seen.has(node) || depth > maxDepth) continue;
    seen.add(node);
    if (!Array.isArray(node)) visit(node);
    const children = Array.isArray(node) ? node : Object.values(node);
    for (let i = children.length - 1; i >= 0; i--) stack.push([children[i], depth + 1]);
  }
}

/** Remplace (ou ajoute) un paramètre de requête dans une URL. */
export function setQueryParam(url, key, value) {
  const u = new URL(url);
  if (value === null || value === undefined) u.searchParams.delete(key);
  else u.searchParams.set(key, String(value));
  return u.toString();
}

/** Premier élément non vide d'une liste de candidats. */
export function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/** Valeur de chaîne propre ou null. */
export function str(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
