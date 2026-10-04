// SeLoger : annonces de location.
//
// ATTENTION : non vérifié sur des pages réelles (site inaccessible depuis l'environnement de
// développement). SeLoger a refondu ses URL de recherche plusieurs fois :
//   ancien format : /list.htm?projects=1&types=1,2&places=[{...}]&LISTING-LISTpg=2
//   format récent : /classified-search?distributionTypes=Rent&estateTypes=Apartment,House&locations=<code>&page=2
// Le code de localisation (ex. "AD08FR....") n'est pas déductible du code postal : la méthode la
// plus fiable est de faire la recherche à la main sur seloger.com puis de coller l'URL obtenue
// dans zone.seloger.searchUrl (seul le paramètre "page" est alors modifié).
//
// Stratégie d'extraction : la page embarque un état applicatif sérialisé (selon les versions :
// window.__UFRN_LIFECYCLE_SERVERREQUEST__, window.initialData, __NEXT_DATA__, ou des
// <script type="application/json">). Plutôt que de dépendre d'un chemin précis, on récupère
// ces états et on parcourt l'arbre à la recherche d'objets "annonce" (identifiant + URL
// /annonces/ + bloc contact/agence). Repli DOM sur les liens /annonces/locations/.

import { IN_PAGE_BLOCK_DETECTION, mapTypes, navigateAndEvaluate } from './common.js';
import { firstDefined, setQueryParam, str, walk } from '../util.js';

export const name = 'seloger';
export const label = 'SeLoger';
const BASE = 'https://www.seloger.com';

export function buildSearchUrl(zone, page = 1, filters = {}) {
  if (zone?.seloger?.searchUrl) {
    if (/A_COMPLETER/.test(zone.seloger.searchUrl)) {
      throw new Error(`seloger : zone "${zone.label}" : remplacer A_COMPLETER dans seloger.searchUrl par une vraie URL de recherche`);
    }
    // L'ancien format pagine avec LISTING-LISTpg, le récent avec page.
    const key = /list\.htm/.test(zone.seloger.searchUrl) ? 'LISTING-LISTpg' : 'page';
    return setQueryParam(zone.seloger.searchUrl, key, page > 1 ? page : null);
  }
  const loc = str(zone?.seloger?.locations);
  if (!loc) {
    throw new Error(
      `seloger : zone "${zone?.label}" sans seloger.searchUrl ni seloger.locations ; ` +
        'faire la recherche sur seloger.com et copier l\'URL (voir README)',
    );
  }
  const u = new URL(`${BASE}/classified-search`);
  u.searchParams.set('distributionTypes', 'Rent');
  const types = mapTypes('seloger', filters.typeBien);
  if (types.length) u.searchParams.set('estateTypes', types.join(','));
  u.searchParams.set('locations', loc);
  if (filters.prixMax) u.searchParams.set('priceMax', String(filters.prixMax));
  if (filters.surfaceMin) u.searchParams.set('spaceMin', String(filters.surfaceMin));
  if (page > 1) u.searchParams.set('page', String(page));
  return u.toString();
}

export const inPageScript = `(() => {
  ${IN_PAGE_BLOCK_DETECTION}
  const states = [];
  const push = (v) => {
    try {
      if (v == null) return;
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      if (s && s.length > 2) states.push(s);
    } catch (e) {}
  };
  for (const k of ['__UFRN_LIFECYCLE_SERVERREQUEST__', 'initialData', '__INITIAL_STATE__', '__PRELOADED_STATE__', '__APOLLO_STATE__']) {
    try { push(window[k]); } catch (e) {}
  }
  for (const s of document.querySelectorAll('script#__NEXT_DATA__, script[type="application/json"]')) push(s.textContent);
  const dom = [];
  for (const a of document.querySelectorAll('a[href*="/annonces/locations/"]')) {
    const card = a.closest('[data-testid*="card"], [data-test*="card"], article, li') || a;
    const ag = card.querySelector('[data-testid*="agency"], [data-test*="agency"], [class*="agency"], [class*="Agency"]');
    dom.push({ href: a.href, agencyName: ag ? ag.textContent.trim() : null });
  }
  return { blocked, states, dom, title: document.title, url: location.href };
})()`;

const CONTACT_KEYS = ['contact', 'provider', 'agency', 'contactData', 'publisher', 'advertiser', 'professional', 'brand'];

function absolutize(url) {
  try {
    return new URL(url, BASE).toString();
  } catch {
    return null;
  }
}

/** Pur : un objet quelconque du JSON -> listing ou null s'il ne ressemble pas à une annonce de location. */
export function objectToListing(o) {
  const rawUrl = str(firstDefined(o.classifiedURL, o.classifiedUrl, o.permalink, o.detailUrl, o.url, o.href));
  if (!rawUrl || !/\/annonces\//.test(rawUrl) || /\/achat/.test(rawUrl)) return null;
  const listingUrl = absolutize(rawUrl);
  const idFromUrl = /\/(\d{5,})\.htm/.exec(rawUrl)?.[1];
  const listingId = str(firstDefined(o.classifiedId, o.listingId, o.publicationId, o.id, idFromUrl));
  if (!listingId || !listingUrl) return null;

  let c = null;
  for (const k of CONTACT_KEYS) {
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) {
      c = o[k];
      break;
    }
  }
  const agencyName = c ? str(firstDefined(c.agencyName, c.name, c.displayName, c.title, c.contactName)) : null;
  const agencyId = c ? str(firstDefined(c.agencyId, c.providerId, c.legacyId, c.id)) : null;
  const rawAgencyUrl = c ? str(firstDefined(c.agencyLink, c.agencyUrl, c.agencyPage, c.url, c.link, c.website)) : null;
  const isPrivate = o.isPrivateSeller === true || c?.isPrivate === true || c?.type === 'private' || c?.type === 'particulier';
  return {
    platform: name,
    listingId,
    listingUrl,
    agencyId,
    agencyName,
    agencyUrl: rawAgencyUrl ? absolutize(rawAgencyUrl) : null,
    isPro: c ? !isPrivate : isPrivate ? false : null,
  };
}

/** Pur : liste d'états JSON (textes ou objets) -> listings dédoublonnés. */
export function parseStates(states = []) {
  const byId = new Map();
  for (const s of states) {
    let root;
    try {
      root = typeof s === 'string' ? JSON.parse(s) : s;
      // Certains états sont doublement sérialisés (JSON.parse("...") côté page).
      if (typeof root === 'string') root = JSON.parse(root);
    } catch {
      continue;
    }
    walk(root, (o) => {
      const l = objectToListing(o);
      if (!l) return;
      const prev = byId.get(l.listingId);
      // On garde la version la plus riche (avec agence) si l'annonce apparaît plusieurs fois.
      if (!prev || (!prev.agencyName && l.agencyName)) byId.set(l.listingId, l);
    });
  }
  return [...byId.values()];
}

export function parseDomItems(items = []) {
  const byId = new Map();
  for (const it of items) {
    const id = /\/(\d{5,})\.htm/.exec(it.href || '')?.[1];
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      platform: name,
      listingId: id,
      listingUrl: it.href,
      agencyId: null,
      agencyName: str(it.agencyName),
      agencyUrl: null,
      isPro: null,
    });
  }
  return [...byId.values()];
}

export function parsePageResult(result) {
  if (!result) return { listings: [], total: null, blocked: false, source: 'vide' };
  const fromJson = parseStates(result.states);
  if (fromJson.length) return { listings: fromJson, total: null, blocked: !!result.blocked, source: 'json' };
  return { listings: parseDomItems(result.dom), total: null, blocked: !!result.blocked, source: 'dom' };
}

export async function fetchPage({ camofox, tabId, zone, page, filters }) {
  const url = buildSearchUrl(zone, page, filters);
  const { nav, result } = await navigateAndEvaluate({ camofox, tabId, url, script: inPageScript });
  const parsed = parsePageResult(result);
  if (nav?.httpStatus === 403) parsed.blocked = true;
  return { url, ...parsed };
}
