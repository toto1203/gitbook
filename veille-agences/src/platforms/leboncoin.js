// Leboncoin : catégorie "Locations" (category=10), annonceurs professionnels (owner_type=pro).
//
// ATTENTION : chemins JSON, paramètres d'URL et sélecteurs ci-dessous sont issus de la structure
// connue du site au moment de l'écriture ; ils n'ont PAS pu être vérifiés sur des pages réelles
// depuis l'environnement de développement (site inaccessible). Ils doivent être validés sur une
// page de recherche live avant tout usage en production (voir README, section "Validation").
//
// Stratégie : la page de recherche (Next.js) embarque un <script id="__NEXT_DATA__"> dont
// props.pageProps.searchData.ads[] contient pour chaque annonce :
//   { list_id, url, subject, category_id, owner: { type: "pro" | "private", store_id, user_id, name, siren } }
// Le JSON est plus stable que le rendu HTML. En secours, un parcours générique de l'arbre
// récupère tout objet portant list_id + owner, et un repli DOM lit les liens d'annonces.

import { IN_PAGE_BLOCK_DETECTION, mapTypes, navigateAndEvaluate } from './common.js';
import { firstDefined, setQueryParam, str, walk } from '../util.js';

export const name = 'leboncoin';
export const label = 'Leboncoin';
const BASE = 'https://www.leboncoin.fr';

/**
 * Identifiant de localisation Leboncoin. Formats observés : "Lyon_69000" (ville),
 * "d_69" (département), "r_22" (région). Si zone.leboncoin.locations est fourni, il est
 * utilisé tel quel ; sinon on construit "Ville_CodePostal".
 */
export function locationParam(zone) {
  if (zone?.leboncoin?.locations) return zone.leboncoin.locations;
  const ville = str(zone?.ville);
  const cp = str(zone?.codePostal);
  if (ville && cp) return `${ville.replace(/\s+/g, '-')}_${cp}`;
  if (cp) return cp;
  if (ville) return ville;
  throw new Error(`leboncoin : zone "${zone?.label}" sans ville ni codePostal ni leboncoin.locations`);
}

export function buildSearchUrl(zone, page = 1, filters = {}) {
  // Si l'utilisateur a collé une URL de recherche complète, on ne touche qu'à la page.
  if (zone?.leboncoin?.searchUrl) {
    return setQueryParam(zone.leboncoin.searchUrl, 'page', page > 1 ? page : null);
  }
  const u = new URL(`${BASE}/recherche`);
  u.searchParams.set('category', '10'); // 10 = Locations
  u.searchParams.set('locations', locationParam(zone));
  u.searchParams.set('owner_type', 'pro');
  const types = mapTypes('leboncoin', filters.typeBien);
  if (types.length) u.searchParams.set('real_estate_type', types.join(','));
  if (filters.prixMax) u.searchParams.set('price', `min-${filters.prixMax}`);
  if (filters.surfaceMin) u.searchParams.set('square', `${filters.surfaceMin}-max`);
  if (page > 1) u.searchParams.set('page', String(page));
  return u.toString();
}

/** Script exécuté dans la page (via POST /tabs/:id/evaluate). Ne fait que collecter les données brutes. */
export const inPageScript = `(() => {
  ${IN_PAGE_BLOCK_DETECTION}
  const el = document.getElementById('__NEXT_DATA__');
  const nextData = el ? el.textContent : null;
  const dom = [];
  if (!nextData) {
    // Repli DOM (sélecteurs à valider) : liens d'annonces de location.
    for (const a of document.querySelectorAll('a[href*="/ad/locations/"], a[href*="/locations/"]')) {
      const card = a.closest('article, li, [data-qa-id="aditem_container"]') || a;
      const owner = card.querySelector('[data-qa-id="aditem_owner"], [data-test-id="adcard-owner"], [data-qa-id="aditem_pro_name"]');
      dom.push({ href: a.href, agencyName: owner ? owner.textContent.trim() : null, isPro: !!card.querySelector('[data-qa-id="aditem_pro"], [data-spark-component="tag"]') });
    }
  }
  return { blocked, nextData, dom, title: document.title, url: location.href };
})()`;

function adToListing(ad) {
  const owner = ad.owner || {};
  const listingId = str(firstDefined(ad.list_id, ad.id));
  if (!listingId) return null;
  const storeId = str(owner.store_id);
  return {
    platform: name,
    listingId,
    listingUrl: str(ad.url) || `${BASE}/ad/locations/${listingId}`,
    agencyId: storeId || str(owner.siren) || null,
    agencyName: str(owner.name),
    agencyUrl: storeId ? `${BASE}/boutique/${storeId}` : null,
    isPro: owner.type ? owner.type === 'pro' : null,
  };
}

/**
 * Pur : JSON __NEXT_DATA__ (objet ou texte) -> { listings, total }.
 * Ne garde que la catégorie 10 (locations) quand category_id est présent.
 */
export function parseNextData(nextData) {
  const root = typeof nextData === 'string' ? JSON.parse(nextData) : nextData;
  const searchData = root?.props?.pageProps?.searchData;
  let ads = Array.isArray(searchData?.ads) ? searchData.ads : null;
  if (!ads) {
    // Secours : structure déplacée, on cherche tout objet ressemblant à une annonce.
    ads = [];
    walk(root, (o) => {
      if (o.list_id !== undefined && o.owner && typeof o.owner === 'object') ads.push(o);
    });
  }
  const listings = ads
    .filter((ad) => ad.category_id === undefined || String(ad.category_id) === '10')
    .map(adToListing)
    .filter(Boolean);
  const total = Number.isFinite(searchData?.total) ? searchData.total : null;
  return { listings, total };
}

/** Pur : éléments du repli DOM -> listings (agence souvent inconnue). */
export function parseDomItems(items = []) {
  const out = [];
  for (const it of items) {
    const m = /\/(\d{6,})(?:\.htm)?(?:[?#].*)?$/.exec(it.href || '');
    if (!m) continue;
    out.push({
      platform: name,
      listingId: m[1],
      listingUrl: it.href,
      agencyId: null,
      agencyName: str(it.agencyName),
      agencyUrl: null,
      isPro: it.isPro ?? null,
    });
  }
  return out;
}

/** Pur : résultat brut du script in-page -> { listings, total, blocked, source }. */
export function parsePageResult(result) {
  if (!result) return { listings: [], total: null, blocked: false, source: 'vide' };
  if (result.nextData) {
    const { listings, total } = parseNextData(result.nextData);
    return { listings, total, blocked: !!result.blocked, source: 'json' };
  }
  return { listings: parseDomItems(result.dom), total: null, blocked: !!result.blocked, source: 'dom' };
}

export async function fetchPage({ camofox, tabId, zone, page, filters }) {
  const url = buildSearchUrl(zone, page, filters);
  const { nav, result } = await navigateAndEvaluate({ camofox, tabId, url, script: inPageScript });
  const parsed = parsePageResult(result);
  if (nav?.httpStatus === 403) parsed.blocked = true;
  return { url, ...parsed };
}
