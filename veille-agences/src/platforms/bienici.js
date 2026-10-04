// Bien'ici : annonces de location.
//
// ATTENTION : non vérifié sur le site réel (inaccessible depuis l'environnement de développement).
// Le front Bien'ici interroge un point d'accès JSON :
//   GET https://www.bienici.com/realEstateAds.json?filters=<JSON encodé>
//   filters = { size, from, page, filterType: "rent", propertyType: [...], onTheMarket: [true],
//               zoneIdsByTypes: { zoneIds: [...] }, maxPrice?, minArea?, sortBy, sortOrder }
//   réponse = { total, realEstateAds: [ { id, adCreatedByPro, accountType, accountDisplayName?, ... } ] }
// Les identifiants de zone (zoneIds) se résolvent via
//   GET https://res.bienici.com/suggest.json?q=<ville ou code postal>
//   réponse = [ { name, postalCodes: [...], zoneIds: [...], type } ]
// Ces deux appels sont faits DEPUIS la page (fetch dans l'onglet camofox, après une visite de la
// page d'accueil) pour bénéficier des cookies et de l'empreinte du navigateur anti-détection.
// Les noms de champs "agence" de la réponse ne sont pas documentés : plusieurs candidats sont
// testés (voir adToListing) et doivent être confirmés sur une réponse réelle.

import { IN_PAGE_BLOCK_DETECTION, mapTypes } from './common.js';
import { firstDefined, normalizeName, str } from '../util.js';

export const name = 'bienici';
export const label = "Bien'ici";
const BASE = 'https://www.bienici.com';
export const PAGE_SIZE = 24;

export function buildFilters(zoneIds, page = 1, filters = {}) {
  const f = {
    size: PAGE_SIZE,
    from: (page - 1) * PAGE_SIZE,
    showAllModels: false,
    filterType: 'rent',
    propertyType: mapTypes('bienici', filters.typeBien),
    page,
    sortBy: 'publicationDate',
    sortOrder: 'desc',
    onTheMarket: [true],
    zoneIdsByTypes: { zoneIds },
  };
  if (f.propertyType.length === 0) f.propertyType = ['house', 'flat'];
  if (filters.prixMax) f.maxPrice = Number(filters.prixMax);
  if (filters.surfaceMin) f.minArea = Number(filters.surfaceMin);
  return f;
}

/** zone.bienici.zoneIds doit être renseigné (directement ou après resolveZoneIds). */
export function buildSearchUrl(zone, page = 1, filters = {}) {
  const zoneIds = zone?.bienici?.zoneIds;
  if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
    throw new Error(`bienici : zone "${zone?.label}" sans bienici.zoneIds (résolution automatique échouée ?)`);
  }
  const u = new URL(`${BASE}/realEstateAds.json`);
  u.searchParams.set('filters', JSON.stringify(buildFilters(zoneIds, page, filters)));
  return u.toString();
}

export function suggestUrl(zone) {
  const q = str(zone?.ville) || str(zone?.codePostal) || str(zone?.label);
  return `https://res.bienici.com/suggest.json?q=${encodeURIComponent(q || '')}`;
}

/** Pur : réponse de suggest.json -> zoneIds de la meilleure correspondance. */
export function pickZoneIds(suggestions, zone) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return [];
  const cp = str(zone?.codePostal);
  const ville = normalizeName(zone?.ville);
  const withIds = suggestions.filter((s) => Array.isArray(s?.zoneIds) && s.zoneIds.length);
  const byCp = cp && withIds.find((s) => (s.postalCodes || []).map(String).includes(cp));
  const byName = ville && withIds.find((s) => normalizeName(s.name) === ville);
  const best = byCp || byName || withIds[0];
  return best ? best.zoneIds.map(String) : [];
}

/** Script in-page : fetch JSON depuis l'origine bienici.com et renvoie le texte brut. */
export function fetchJsonScript(url) {
  return `(async () => {
    ${IN_PAGE_BLOCK_DETECTION}
    if (blocked) return { blocked, status: null, text: null };
    try {
      const r = await fetch(${JSON.stringify(url)}, { credentials: 'include', headers: { Accept: 'application/json' } });
      return { blocked: false, status: r.status, text: await r.text() };
    } catch (e) {
      return { blocked: false, status: null, text: null, error: String(e) };
    }
  })()`;
}

function adToListing(ad) {
  const listingId = str(ad?.id);
  if (!listingId) return null;
  const contact = ad.contactRelativeData || ad.contact || ad.agency || {};
  // Les identifiants d'annonces issues de flux d'agences ont souvent un préfixe de compte
  // (ex. "ag690123-412345678") : utilisé en dernier recours comme identifiant d'agence.
  const prefixId = /^(ag\d+)-/i.exec(listingId)?.[1] || null;
  const agencyId = str(
    firstDefined(
      ad.accountId,
      ad.customerId,
      Array.isArray(ad.userRelativeData?.accountIds) ? ad.userRelativeData.accountIds[0] : null,
      contact.accountId,
      contact.agencyId,
      prefixId,
    ),
  );
  const agencyName = str(
    firstDefined(ad.accountDisplayName, ad.agencyName, contact.contactNameToDisplay, contact.agencyName, contact.name),
  );
  let isPro = null;
  if (typeof ad.adCreatedByPro === 'boolean') isPro = ad.adCreatedByPro;
  else if (ad.accountType) isPro = !/particulier|private|individual/i.test(String(ad.accountType));
  return {
    platform: name,
    listingId,
    listingUrl: str(ad.url) || `${BASE}/annonce/${encodeURIComponent(listingId)}`,
    agencyId,
    agencyName,
    agencyUrl: str(firstDefined(ad.agencyUrl, contact.agencyUrl, contact.url)),
    isPro,
  };
}

/** Pur : réponse realEstateAds.json (objet ou texte) -> { listings, total }. */
export function parseAdsResponse(json) {
  const root = typeof json === 'string' ? JSON.parse(json) : json;
  const ads = Array.isArray(root?.realEstateAds) ? root.realEstateAds : [];
  const listings = ads
    .filter((ad) => !ad.adType || ad.adType === 'rent')
    .map(adToListing)
    .filter(Boolean);
  return { listings, total: Number.isFinite(root?.total) ? root.total : null };
}

/** Visite la page d'accueil une fois par onglet pour obtenir cookies et contexte d'origine. */
export async function prepare({ camofox, tabId }) {
  await camofox.navigate(tabId, `${BASE}/`);
  await camofox.wait(tabId, { timeout: 15_000, waitForNetwork: true, dismissConsent: true });
}

export async function resolveZoneIds({ camofox, tabId, zone }) {
  if (Array.isArray(zone?.bienici?.zoneIds) && zone.bienici.zoneIds.length) return zone.bienici.zoneIds;
  const res = await camofox.evaluate(tabId, fetchJsonScript(suggestUrl(zone)));
  if (!res?.text) return [];
  try {
    return pickZoneIds(JSON.parse(res.text), zone);
  } catch {
    return [];
  }
}

export async function fetchPage({ camofox, tabId, zone, page, filters }) {
  const url = buildSearchUrl(zone, page, filters);
  const res = await camofox.evaluate(tabId, fetchJsonScript(url));
  if (res?.blocked || res?.status === 403) return { url, listings: [], total: null, blocked: true, source: 'json' };
  if (!res?.text) throw new Error(`bienici : réponse vide (HTTP ${res?.status ?? '?'}) ${res?.error || ''}`.trim());
  let parsed;
  try {
    parsed = parseAdsResponse(res.text);
  } catch {
    throw new Error(`bienici : réponse non JSON (HTTP ${res.status}) : ${res.text.slice(0, 120)}`);
  }
  return { url, ...parsed, blocked: false, source: 'json' };
}
