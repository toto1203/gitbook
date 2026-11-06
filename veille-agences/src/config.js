// Chargement et validation de la configuration.

import { readFile } from 'node:fs/promises';
import { PLATFORMS } from './platforms/index.js';

export const DEFAULTS = {
  // Options du navigateur Camoufox (voir src/browser.js).
  browser: {
    headless: true, // true, false (fenêtre visible) ou "virtual" (écran virtuel Xvfb, Linux)
    humanize: true, // mouvements de souris humanisés
    proxy: null, // { "server": "http://hote:port", "username": "...", "password": "..." }
    locale: 'fr-FR', // identité utilisée sans proxy
    timezoneId: 'Europe/Paris',
  },
  platforms: { leboncoin: true, seloger: true, bienici: true },
  zones: [],
  filters: { typeBien: [], prixMax: null, surfaceMin: null },
  seuilAnnonces: 10,
  maxPages: 20,
  delays: { minMs: 4000, maxMs: 9000 },
  outputDir: 'output',
};

export function normalizeConfig(raw = {}) {
  const cfg = {
    ...DEFAULTS,
    ...raw,
    platforms: { ...DEFAULTS.platforms, ...(raw.platforms || {}) },
    filters: { ...DEFAULTS.filters, ...(raw.filters || {}) },
    delays: { ...DEFAULTS.delays, ...(raw.delays || {}) },
    browser: { ...DEFAULTS.browser, ...(raw.browser || {}) },
  };
  const errors = [];
  if (raw.camofoxUrl || raw.userId || raw.accessKey) {
    errors.push('"camofoxUrl", "userId" et "accessKey" ne sont plus utilisés (camofox-browser remplacé par Camoufox en direct) : les retirer et utiliser "browser"');
  }
  const b = cfg.browser;
  if (![true, false, 'virtual'].includes(b.headless)) errors.push('"browser.headless" doit valoir true, false ou "virtual"');
  if (b.proxy !== null && b.proxy !== undefined) {
    const server = typeof b.proxy === 'string' ? b.proxy : b.proxy?.server;
    if (!server || !/^(https?|socks5?):\/\/[^/\s]+/i.test(String(server))) {
      errors.push('"browser.proxy.server" doit être une URL du type http://hote:port ou socks5://hote:port');
    }
  }
  if (!Array.isArray(cfg.zones) || cfg.zones.length === 0) errors.push('"zones" doit contenir au moins une zone');
  cfg.zones.forEach((z, i) => {
    if (!z || typeof z !== 'object') errors.push(`zones[${i}] invalide`);
    else if (!z.label) errors.push(`zones[${i}] : "label" obligatoire`);
    else if (!z.ville && !z.codePostal && !z.leboncoin && !z.seloger && !z.bienici) {
      errors.push(`zones[${i}] (${z.label}) : renseigner ville, codePostal ou des identifiants par plateforme`);
    }
  });
  for (const p of Object.keys(cfg.platforms)) {
    if (!PLATFORMS[p]) errors.push(`plateforme inconnue "${p}" (valeurs possibles : ${Object.keys(PLATFORMS).join(', ')})`);
  }
  if (!Number.isFinite(cfg.seuilAnnonces) || cfg.seuilAnnonces < 0) errors.push('"seuilAnnonces" doit être un nombre positif');
  if (!Number.isInteger(cfg.maxPages) || cfg.maxPages < 1) errors.push('"maxPages" doit être un entier >= 1');
  if (cfg.delays.minMs < 1000) errors.push('"delays.minMs" doit être >= 1000 ms (politesse envers les sites)');
  if (cfg.delays.maxMs < cfg.delays.minMs) errors.push('"delays.maxMs" doit être >= "delays.minMs"');
  if (errors.length) throw new Error('Configuration invalide :\n  - ' + errors.join('\n  - '));
  return cfg;
}

export async function loadConfig(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(`Impossible de lire ${path} (${err.code || err.message}). Copier config.example.json en config.json.`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`${path} n'est pas un JSON valide : ${err.message}`);
  }
  return normalizeConfig(raw);
}
