// Agrégation : dédoublonnage des annonces et comptage par agence, plateforme par plateforme.
// Exigence métier : une agence est retenue si elle a STRICTEMENT plus de `seuil` annonces de
// location sur UNE MÊME plateforme. Les plateformes ne sont jamais additionnées entre elles.

import { normalizeName } from './util.js';

/** Dédoublonne par (platform, listingId) en fusionnant les zones où l'annonce a été vue. */
export function dedupeListings(listings) {
  const map = new Map();
  for (const l of listings) {
    if (!l?.platform || !l?.listingId) continue;
    const key = `${l.platform}::${l.listingId}`;
    const prev = map.get(key);
    const zones = new Set([...(prev?.zones || []), ...(l.zones || []), ...(l.zone ? [l.zone] : [])]);
    if (!prev) {
      map.set(key, { ...l, zones: [...zones] });
    } else {
      // Complète les champs manquants avec la nouvelle occurrence.
      const merged = { ...prev };
      for (const k of ['agencyId', 'agencyName', 'agencyUrl', 'listingUrl']) {
        if (!merged[k] && l[k]) merged[k] = l[k];
      }
      if (merged.isPro === null || merged.isPro === undefined) merged.isPro = l.isPro ?? null;
      merged.zones = [...zones];
      map.set(key, merged);
    }
  }
  return [...map.values()];
}

/**
 * @param {Array} listings annonces brutes (toutes plateformes)
 * @param {object} [opts]
 * @param {number} [opts.seuil=10] seuil strict : on garde nb_annonces > seuil
 * @param {number} [opts.exemples=3] nombre d'URL d'exemple par agence
 * @returns {{ agences: Array, stats: object }}
 */
export function aggregate(listings, { seuil = 10, exemples = 3 } = {}) {
  const unique = dedupeListings(listings);

  // Passe 1 : associer un nom normalisé à un identifiant quand on en a vu un, pour
  // rattacher les annonces où seul le nom est connu.
  const idByName = new Map();
  for (const l of unique) {
    const n = normalizeName(l.agencyName);
    if (l.agencyId && n) {
      const k = `${l.platform}::${n}`;
      if (!idByName.has(k)) idByName.set(k, String(l.agencyId));
    }
  }

  const groups = new Map();
  let ignoreesParticulier = 0;
  let ignoreesSansAgence = 0;
  for (const l of unique) {
    if (l.isPro === false) {
      ignoreesParticulier++;
      continue;
    }
    const n = normalizeName(l.agencyName);
    const id = l.agencyId ? String(l.agencyId) : idByName.get(`${l.platform}::${n}`) || null;
    if (!id && !n) {
      ignoreesSansAgence++;
      continue;
    }
    const key = `${l.platform}::${id ? `id:${id}` : `nom:${n}`}`;
    let g = groups.get(key);
    if (!g) {
      g = { plateforme: l.platform, agence: l.agencyName || null, idAgence: id, urlAgence: l.agencyUrl || null, annonces: [], zones: new Set() };
      groups.set(key, g);
    }
    if (!g.agence && l.agencyName) g.agence = l.agencyName;
    if (!g.urlAgence && l.agencyUrl) g.urlAgence = l.agencyUrl;
    g.annonces.push(l.listingUrl);
    for (const z of l.zones || []) g.zones.add(z);
  }

  const toutes = [...groups.values()].map((g) => ({
    plateforme: g.plateforme,
    agence: g.agence || '(nom inconnu)',
    idAgence: g.idAgence,
    urlAgence: g.urlAgence,
    nbAnnoncesLocation: g.annonces.length,
    zones: [...g.zones].sort(),
    exemplesAnnonces: g.annonces.filter(Boolean).slice(0, exemples),
  }));

  const agences = toutes
    .filter((a) => a.nbAnnoncesLocation > seuil)
    .sort(
      (a, b) =>
        b.nbAnnoncesLocation - a.nbAnnoncesLocation ||
        a.plateforme.localeCompare(b.plateforme) ||
        a.agence.localeCompare(b.agence, 'fr'),
    );

  return {
    agences,
    stats: {
      annoncesBrutes: listings.length,
      annoncesUniques: unique.length,
      ignoreesParticulier,
      ignoreesSansAgence,
      agencesVues: toutes.length,
      agencesRetenues: agences.length,
      seuil,
    },
  };
}
