import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, dedupeListings } from '../src/aggregate.js';
import { toCsv, csvCell, CSV_COLUMNS } from '../src/output.js';
import { normalizeName } from '../src/util.js';
import { normalizeConfig } from '../src/config.js';

const mk = (platform, n, agency, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({
    platform,
    listingId: `${agency.id ?? agency.name}-${i}`,
    listingUrl: `https://ex/${platform}/${agency.id ?? agency.name}/${i}`,
    agencyId: agency.id ?? null,
    agencyName: agency.name ?? null,
    agencyUrl: null,
    isPro: true,
    zone: 'Lyon',
    ...extra,
  }));

test('normalizeName : accents, ponctuation, casse', () => {
  assert.equal(normalizeName("L'Agence  du Parc - Lyon"), 'l agence du parc lyon');
  assert.equal(normalizeName('IMMO RHÔNE'), 'immo rhone');
});

test('dédoublonnage par (plateforme, listingId) avec fusion des zones', () => {
  const a = { platform: 'leboncoin', listingId: '1', zone: 'Lyon', agencyName: null };
  const b = { platform: 'leboncoin', listingId: '1', zone: 'Villeurbanne', agencyName: 'Agence A' };
  const c = { platform: 'seloger', listingId: '1', zone: 'Lyon' };
  const out = dedupeListings([a, b, c]);
  assert.equal(out.length, 2);
  const lbc = out.find((l) => l.platform === 'leboncoin');
  assert.deepEqual(lbc.zones.sort(), ['Lyon', 'Villeurbanne']);
  assert.equal(lbc.agencyName, 'Agence A');
});

test('seuil strict : 10 annonces ne suffisent pas, 11 oui', () => {
  const listings = [...mk('leboncoin', 10, { id: 'A', name: 'Dix' }), ...mk('leboncoin', 11, { id: 'B', name: 'Onze' })];
  const { agences } = aggregate(listings, { seuil: 10 });
  assert.deepEqual(agences.map((a) => a.agence), ['Onze']);
  assert.equal(agences[0].nbAnnoncesLocation, 11);
  assert.equal(agences[0].exemplesAnnonces.length, 3);
});

test('comptage par plateforme séparément (pas de cumul inter-plateformes)', () => {
  const listings = [...mk('leboncoin', 6, { id: 'X', name: 'Agence X' }), ...mk('seloger', 6, { id: 'X', name: 'Agence X' })];
  assert.equal(aggregate(listings, { seuil: 10 }).agences.length, 0);
  assert.equal(aggregate(listings, { seuil: 5 }).agences.length, 2);
});

test('doublons ignorés dans le comptage', () => {
  const base = mk('bienici', 11, { id: 'D', name: 'Doublons' });
  const { agences, stats } = aggregate([...base, ...base], { seuil: 10 });
  assert.equal(agences[0].nbAnnoncesLocation, 11);
  assert.equal(stats.annoncesUniques, 11);
});

test('regroupement par nom normalisé et rattachement nom -> id', () => {
  const withId = mk('seloger', 5, { id: 'S1', name: 'Immo Rhône' });
  const nameOnly = mk('seloger', 4, { name: 'IMMO RHONE' });
  const nameOnly2 = mk('seloger', 3, { name: 'immo-rhone ' }).map((l) => ({ ...l, listingId: `bis-${l.listingId}` }));
  const { agences } = aggregate([...withId, ...nameOnly, ...nameOnly2], { seuil: 10 });
  assert.equal(agences.length, 1);
  assert.equal(agences[0].idAgence, 'S1');
  assert.equal(agences[0].nbAnnoncesLocation, 12);
});

test('particuliers et annonces sans agence exclus, tri décroissant', () => {
  const listings = [
    ...mk('leboncoin', 12, { id: 'P', name: 'Particulier' }, { isPro: false }),
    ...mk('leboncoin', 3, {}),
    ...mk('leboncoin', 12, { id: 'B', name: 'Bravo' }),
    ...mk('seloger', 20, { id: 'A', name: 'Alpha' }),
  ];
  const { agences, stats } = aggregate(listings, { seuil: 10 });
  assert.deepEqual(agences.map((a) => [a.plateforme, a.agence, a.nbAnnoncesLocation]), [
    ['seloger', 'Alpha', 20],
    ['leboncoin', 'Bravo', 12],
  ]);
  assert.equal(stats.ignoreesParticulier, 12);
  assert.equal(stats.ignoreesSansAgence, 3);
});

test('CSV : colonnes, séparateur ;, échappement', () => {
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('il dit "oui"'), '"il dit ""oui"""');
  assert.equal(csvCell(null), '');
  const csv = toCsv([
    { plateforme: 'leboncoin', agence: 'Agence; "Test"', idAgence: '1', urlAgence: null, nbAnnoncesLocation: 11, zones: ['Lyon', 'Bron'], exemplesAnnonces: ['u1', 'u2'] },
  ]);
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines[0], CSV_COLUMNS.join(';'));
  assert.equal(lines[1], 'leboncoin;"Agence; ""Test""";1;;11;Lyon | Bron;u1 | u2');
});

test('configuration : valeurs par défaut et validation', () => {
  const cfg = normalizeConfig({ zones: [{ label: 'Lyon', ville: 'Lyon' }] });
  assert.equal(cfg.seuilAnnonces, 10);
  assert.equal(cfg.platforms.leboncoin, true);
  assert.throws(() => normalizeConfig({ zones: [] }), /zones/);
  assert.throws(() => normalizeConfig({ zones: [{ label: 'L', ville: 'L' }], platforms: { pap: true } }), /pap/);
  assert.throws(() => normalizeConfig({ zones: [{ label: 'L', ville: 'L' }], delays: { minMs: 100, maxMs: 200 } }), /minMs/);
});
