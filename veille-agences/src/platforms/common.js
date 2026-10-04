// Éléments communs aux plateformes.

export class BlockedError extends Error {
  constructor(platform, detail) {
    super(`${platform} : accès bloqué (anti-bot / captcha). ${detail || ''}`.trim());
    this.name = 'BlockedError';
    this.platform = platform;
  }
}

/**
 * Fragment JS exécuté dans la page : détecte les pages de blocage les plus courantes.
 * Leboncoin et SeLoger utilisent DataDome (iframe captcha-delivery.com) ; on teste aussi
 * Cloudflare et les titres typiques. À ajuster si un autre mécanisme apparaît.
 */
export const IN_PAGE_BLOCK_DETECTION = `
  const blocked = !!document.querySelector('iframe[src*="captcha-delivery.com"], iframe[src*="challenges.cloudflare.com"], #challenge-form')
    || /datadome|captcha|access denied|acc[eè]s refus[ée]|just a moment/i.test(document.title || '');
`;

/**
 * Scénario standard : navigation vers l'URL de recherche, attente du chargement,
 * puis évaluation du script d'extraction dans la page.
 */
export async function navigateAndEvaluate({ camofox, tabId, url, script }) {
  const nav = await camofox.navigate(tabId, url);
  await camofox.wait(tabId, { timeout: 15_000, waitForNetwork: true, dismissConsent: true });
  const result = await camofox.evaluate(tabId, script);
  return { nav, result };
}

/** Correspondance des types de biens "métier" vers chaque plateforme. */
export const TYPE_BIEN = {
  leboncoin: { maison: '1', appartement: '2', terrain: '3', parking: '4', autre: '5' },
  seloger: { appartement: 'Apartment', maison: 'House', parking: 'Parking', terrain: 'Land', bureau: 'Office' },
  bienici: { appartement: 'flat', maison: 'house', parking: 'parking', terrain: 'terrain', bureau: 'office', loft: 'loft', chateau: 'castle' },
};

export function mapTypes(platform, typeBien) {
  if (!Array.isArray(typeBien) || typeBien.length === 0) return [];
  const table = TYPE_BIEN[platform];
  return typeBien.map((t) => table[String(t).toLowerCase()]).filter(Boolean);
}
