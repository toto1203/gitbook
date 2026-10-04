import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as leboncoin from '../src/platforms/leboncoin.js';
import * as seloger from '../src/platforms/seloger.js';
import * as bienici from '../src/platforms/bienici.js';

const fixture = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

// ---------- Leboncoin ----------

test('leboncoin : URL de recherche (locations, pro, filtres, page)', () => {
  const url = new URL(
    leboncoin.buildSearchUrl({ label: 'Lyon', ville: 'Lyon', codePostal: '69000' }, 3, {
      typeBien: ['appartement', 'maison'],
      prixMax: 1200,
      surfaceMin: 25,
    }),
  );
  assert.equal(url.origin + url.pathname, 'https://www.leboncoin.fr/recherche');
  assert.equal(url.searchParams.get('category'), '10');
  assert.equal(url.searchParams.get('owner_type'), 'pro');
  assert.equal(url.searchParams.get('locations'), 'Lyon_69000');
  assert.equal(url.searchParams.get('real_estate_type'), '2,1');
  assert.equal(url.searchParams.get('price'), 'min-1200');
  assert.equal(url.searchParams.get('square'), '25-max');
  assert.equal(url.searchParams.get('page'), '3');
});

test('leboncoin : searchUrl fourni, seule la page change', () => {
  const zone = { label: 'X', leboncoin: { searchUrl: 'https://www.leboncoin.fr/recherche?category=10&locations=d_69&page=7' } };
  assert.equal(new URL(leboncoin.buildSearchUrl(zone, 2)).searchParams.get('page'), '2');
  assert.equal(new URL(leboncoin.buildSearchUrl(zone, 1)).searchParams.has('page'), false);
});

test('leboncoin : __NEXT_DATA__ -> annonces (catégorie 10 uniquement)', () => {
  const { listings, total } = leboncoin.parseNextData(fixture('leboncoin-next-data.json'));
  assert.equal(total, 4);
  assert.equal(listings.length, 3);
  assert.deepEqual(listings[0], {
    platform: 'leboncoin',
    listingId: '2800000001',
    listingUrl: 'https://www.leboncoin.fr/ad/locations/2800000001',
    agencyId: '12345',
    agencyName: 'Agence du Parc',
    agencyUrl: 'https://www.leboncoin.fr/boutique/12345',
    isPro: true,
  });
  const particulier = listings.find((l) => l.listingId === '2800000003');
  assert.equal(particulier.isPro, false);
  assert.equal(particulier.listingUrl, 'https://www.leboncoin.fr/ad/locations/2800000003');
});

test('leboncoin : secours par parcours si le chemin JSON a changé', () => {
  const moved = { props: { pageProps: { autreChose: { liste: [{ list_id: 1, owner: { type: 'pro', store_id: 7, name: 'A' } }] } } } };
  const { listings } = leboncoin.parseNextData(moved);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].agencyId, '7');
});

test('leboncoin : repli DOM et détection de blocage', () => {
  const r = leboncoin.parsePageResult({
    blocked: false,
    nextData: null,
    dom: [{ href: 'https://www.leboncoin.fr/ad/locations/2811111111', agencyName: 'Agence Z', isPro: true }, { href: 'https://www.leboncoin.fr/c/locations' }],
  });
  assert.equal(r.source, 'dom');
  assert.equal(r.listings.length, 1);
  assert.equal(r.listings[0].agencyName, 'Agence Z');
  assert.equal(leboncoin.parsePageResult({ blocked: true, dom: [] }).blocked, true);
});

test('leboncoin : le script in-page est une expression JS valide', () => {
  assert.doesNotThrow(() => new Function(`return ${leboncoin.inPageScript};`));
});

// ---------- SeLoger ----------

test('seloger : URL construite depuis locations', () => {
  const url = new URL(seloger.buildSearchUrl({ label: 'Lyon', seloger: { locations: 'AD08FR1' } }, 2, { typeBien: ['appartement'], prixMax: 900 }));
  assert.equal(url.pathname, '/classified-search');
  assert.equal(url.searchParams.get('distributionTypes'), 'Rent');
  assert.equal(url.searchParams.get('estateTypes'), 'Apartment');
  assert.equal(url.searchParams.get('locations'), 'AD08FR1');
  assert.equal(url.searchParams.get('priceMax'), '900');
  assert.equal(url.searchParams.get('page'), '2');
});

test('seloger : searchUrl ancien format pagine avec LISTING-LISTpg', () => {
  const zone = { label: 'L', seloger: { searchUrl: 'https://www.seloger.com/list.htm?projects=1&types=1' } };
  assert.equal(new URL(seloger.buildSearchUrl(zone, 4)).searchParams.get('LISTING-LISTpg'), '4');
});

test('seloger : erreurs de configuration explicites', () => {
  assert.throws(() => seloger.buildSearchUrl({ label: 'L' }, 1), /seloger\.searchUrl/);
  assert.throws(() => seloger.buildSearchUrl({ label: 'L', seloger: { searchUrl: 'https://www.seloger.com/x?locations=A_COMPLETER' } }, 1), /A_COMPLETER/);
});

test('seloger : état JSON -> annonces de location dédoublonnées, achats exclus', () => {
  const listings = seloger.parseStates([fixture('seloger-state.json')]);
  assert.equal(listings.length, 2);
  const a = listings.find((l) => l.listingId === '243700001');
  assert.deepEqual(a, {
    platform: 'seloger',
    listingId: '243700001',
    listingUrl: 'https://www.seloger.com/annonces/locations/appartement/lyon-3eme-69/243700001.htm',
    agencyId: 'AG-77',
    agencyName: 'Immo Rhône',
    agencyUrl: 'https://www.seloger.com/professionnels/agences-immobilieres/immo-rhone-77.htm',
    isPro: true,
  });
  const b = listings.find((l) => l.listingId === '243700002');
  assert.equal(b.agencyName, 'Immo Rhône', 'la version avec agence est conservée');
});

test('seloger : état doublement sérialisé et repli DOM', () => {
  const double = JSON.stringify(fixture('seloger-state.json'));
  assert.equal(seloger.parseStates([double]).length, 2);
  const r = seloger.parsePageResult({ states: ['{}'], dom: [{ href: 'https://www.seloger.com/annonces/locations/appartement/lyon/123456.htm', agencyName: 'Agence Y' }] });
  assert.equal(r.source, 'dom');
  assert.equal(r.listings[0].listingId, '123456');
  assert.doesNotThrow(() => new Function(`return ${seloger.inPageScript};`));
});

// ---------- Bien'ici ----------

test("bienici : URL realEstateAds.json avec filtres location", () => {
  const url = new URL(bienici.buildSearchUrl({ label: 'Lyon', bienici: { zoneIds: ['-120965'] } }, 2, { prixMax: 1000, surfaceMin: 20 }));
  assert.equal(url.pathname, '/realEstateAds.json');
  const f = JSON.parse(url.searchParams.get('filters'));
  assert.equal(f.filterType, 'rent');
  assert.deepEqual(f.zoneIdsByTypes, { zoneIds: ['-120965'] });
  assert.equal(f.from, bienici.PAGE_SIZE);
  assert.equal(f.page, 2);
  assert.equal(f.maxPrice, 1000);
  assert.equal(f.minArea, 20);
  assert.deepEqual(f.propertyType, ['house', 'flat']);
  assert.throws(() => bienici.buildSearchUrl({ label: 'Sans' }, 1), /zoneIds/);
});

test('bienici : choix des zoneIds depuis suggest.json', () => {
  const suggestions = [
    { name: 'Lyon (69)', type: 'department', zoneIds: ['-1'] },
    { name: 'Lyon', postalCodes: ['69001', '69003'], zoneIds: ['-120965'] },
  ];
  assert.deepEqual(bienici.pickZoneIds(suggestions, { ville: 'Lyon', codePostal: '69003' }), ['-120965']);
  assert.deepEqual(bienici.pickZoneIds(suggestions, { ville: 'lyon (69)' }), ['-1']);
  assert.deepEqual(bienici.pickZoneIds([], { ville: 'X' }), []);
});

test('bienici : réponse JSON -> annonces', () => {
  const { listings, total } = bienici.parseAdsResponse(fixture('bienici-ads.json'));
  assert.equal(total, 3);
  assert.equal(listings.length, 3);
  assert.equal(listings[0].agencyId, 'ag690123');
  assert.equal(listings[0].agencyName, 'Century Lyon Part-Dieu');
  assert.equal(listings[0].isPro, true);
  assert.equal(listings[1].agencyId, 'acc-42');
  assert.equal(listings[1].agencyName, 'Foncia Lyon');
  assert.equal(listings[2].isPro, false);
  assert.doesNotThrow(() => new Function(`return ${bienici.fetchJsonScript('https://www.bienici.com/x?y="z"')};`));
});
