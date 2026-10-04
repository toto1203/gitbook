#!/usr/bin/env node
// CLI : node src/index.js --config config.json [--platform leboncoin]
//
// Parcourt, pour chaque plateforme activée et chaque zone, les pages de résultats de recherche
// "location", collecte les annonces, puis retient les agences ayant strictement plus de
// `seuilAnnonces` annonces sur une même plateforme. Écrit output/agences-AAAA-MM-JJ.{csv,json}.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { CamofoxClient, CamofoxError } from './camofox.js';
import { loadConfig } from './config.js';
import { aggregate } from './aggregate.js';
import { writeOutputs } from './output.js';
import { PLATFORMS } from './platforms/index.js';
import { BlockedError } from './platforms/common.js';
import { randomDelay } from './util.js';

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const USAGE = `Usage : node src/index.js --config config.json [--platform leboncoin|seloger|bienici]

Options :
  -c, --config     chemin du fichier de configuration (défaut : config.json)
  -p, --platform   limiter l'exécution à une plateforme (option répétable)
  -h, --help       afficher cette aide`;

async function saveDebugSnapshot(camofox, tabId, outputDir, tag) {
  try {
    const snap = await camofox.snapshot(tabId);
    const dir = join(outputDir, 'debug');
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${tag.replace(/[^a-z0-9_-]+/gi, '_')}.txt`);
    await writeFile(file, `URL : ${snap?.url}\n\n${snap?.snapshot || ''}`, 'utf8');
    log(`  instantané de diagnostic enregistré : ${file}`);
  } catch (err) {
    log(`  (instantané de diagnostic impossible : ${err.message})`);
  }
}

async function scrapePlatform({ mod, camofox, cfg, erreurs }) {
  const sessionKey = `veille-${mod.name}`;
  let tabId = null;
  const openTab = async () => {
    tabId = (await camofox.createTab({ sessionKey })).tabId;
    if (mod.prepare) await mod.prepare({ camofox, tabId });
  };
  // Exécute fn ; si l'onglet a disparu (inactivité, redémarrage du navigateur), en rouvre un et réessaie une fois.
  const withTab = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof CamofoxError) || !err.tabGone) throw err;
      log(`  onglet perdu (${err.status}), réouverture`);
      await openTab();
      return fn();
    }
  };

  await openTab();
  const collected = [];
  let first = true;
  try {
    for (const zone of cfg.zones) {
      try {
        let z = zone;
        if (mod.resolveZoneIds) {
          const zoneIds = await withTab(() => mod.resolveZoneIds({ camofox, tabId, zone }));
          if (!zoneIds.length) throw new Error(`zone "${zone.label}" introuvable (renseigner ${mod.name}.zoneIds)`);
          z = { ...zone, [mod.name]: { ...(zone[mod.name] || {}), zoneIds } };
        }
        const seen = new Set();
        for (let page = 1; page <= cfg.maxPages; page++) {
          if (!first) await randomDelay(cfg.delays);
          first = false;
          const res = await withTab(() => mod.fetchPage({ camofox, tabId, zone: z, page, filters: cfg.filters }));
          if (res.blocked) {
            await saveDebugSnapshot(camofox, tabId, cfg.outputDir, `${mod.name}-${zone.label}-p${page}-bloque`);
            throw new BlockedError(mod.label, 'Essayer plus tard, allonger les délais ou configurer un proxy résidentiel.');
          }
          if (page === 1 && res.source === 'dom') {
            log(`  ${mod.label} / ${zone.label} : JSON embarqué introuvable, repli DOM (agences probablement non identifiées)`);
            await saveDebugSnapshot(camofox, tabId, cfg.outputDir, `${mod.name}-${zone.label}-p1-repli-dom`);
          }
          const fresh = res.listings.filter((l) => !seen.has(l.listingId));
          for (const l of fresh) {
            seen.add(l.listingId);
            collected.push({ ...l, zone: zone.label });
          }
          const totalTxt = res.total != null ? ` / ${res.total} annoncés` : '';
          log(`  ${mod.label} / ${zone.label} / page ${page} : ${res.listings.length} annonces, ${fresh.length} nouvelles (cumul zone ${seen.size}${totalTxt})`);
          if (fresh.length === 0) break; // page vide ou répétée : fin de pagination
          if (res.total != null && seen.size >= res.total) break;
          if (page === cfg.maxPages) log(`  ${mod.label} / ${zone.label} : maxPages (${cfg.maxPages}) atteint, résultats possiblement incomplets`);
        }
      } catch (err) {
        if (err instanceof BlockedError) throw err; // inutile d'insister sur les autres zones
        log(`  ERREUR ${mod.label} / ${zone.label} : ${err.message}`);
        erreurs.push({ plateforme: mod.name, zone: zone.label, message: err.message });
      }
    }
  } finally {
    if (tabId) await camofox.closeTab(tabId).catch(() => {});
  }
  return collected;
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: 'string', short: 'c', default: 'config.json' },
      platform: { type: 'string', short: 'p', multiple: true },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const cfg = await loadConfig(values.config);
  let names = Object.entries(cfg.platforms).filter(([, on]) => on).map(([n]) => n);
  if (values.platform?.length) {
    const unknown = values.platform.filter((p) => !PLATFORMS[p]);
    if (unknown.length) throw new Error(`plateforme inconnue : ${unknown.join(', ')}`);
    names = values.platform;
  }
  if (names.length === 0) throw new Error('aucune plateforme activée');

  const camofox = new CamofoxClient({
    baseUrl: cfg.camofoxUrl,
    userId: cfg.userId,
    accessKey: process.env.CAMOFOX_ACCESS_KEY || cfg.accessKey || null,
    log,
  });
  try {
    const h = await camofox.health();
    log(`camofox joignable (${cfg.camofoxUrl}, moteur ${h?.engine ?? '?'})`);
  } catch (err) {
    throw new Error(`camofox injoignable sur ${cfg.camofoxUrl} : ${err.message}\nLancer d'abord : docker compose up -d`);
  }

  const all = [];
  const erreurs = [];
  try {
    for (const n of names) {
      const mod = PLATFORMS[n];
      log(`=== ${mod.label} : ${cfg.zones.length} zone(s), ${cfg.maxPages} page(s) max par zone`);
      try {
        const listings = await scrapePlatform({ mod, camofox, cfg, erreurs });
        log(`=== ${mod.label} : ${listings.length} annonces collectées`);
        all.push(...listings);
      } catch (err) {
        log(`=== ${mod.label} : ABANDON : ${err.message}`);
        erreurs.push({ plateforme: n, zone: null, message: err.message });
      }
    }
  } finally {
    await camofox.closeSession().catch(() => {});
  }

  const { agences, stats } = aggregate(all, { seuil: cfg.seuilAnnonces });
  const { csvPath, jsonPath } = await writeOutputs({ outputDir: cfg.outputDir, agences, stats, erreurs });
  log(`Annonces uniques : ${stats.annoncesUniques} ; agences vues : ${stats.agencesVues} ; agences > ${cfg.seuilAnnonces} annonces : ${stats.agencesRetenues}`);
  if (stats.ignoreesSansAgence) log(`Annonces sans agence identifiable (ignorées) : ${stats.ignoreesSansAgence}`);
  for (const a of agences.slice(0, 20)) log(`  ${a.plateforme.padEnd(9)} ${String(a.nbAnnoncesLocation).padStart(4)}  ${a.agence}`);
  log(`Résultats : ${csvPath} et ${jsonPath}`);
  if (erreurs.length) log(`${erreurs.length} erreur(s), détail dans le JSON de sortie`);
  return erreurs.length && all.length === 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`Erreur : ${err.message}`);
      process.exit(1);
    },
  );
}
