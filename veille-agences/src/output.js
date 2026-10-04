// Écriture des résultats (CSV + JSON).

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CSV_COLUMNS = [
  'plateforme',
  'agence',
  'id_agence',
  'url_agence',
  'nb_annonces_location',
  'zones',
  'exemples_annonces',
];

// Séparateur ";" : ouverture directe dans Excel configuré en français.
const SEP = ';';

export function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(agences) {
  const lines = [CSV_COLUMNS.join(SEP)];
  for (const a of agences) {
    lines.push(
      [
        a.plateforme,
        a.agence,
        a.idAgence,
        a.urlAgence,
        a.nbAnnoncesLocation,
        a.zones.join(' | '),
        a.exemplesAnnonces.join(' | '),
      ]
        .map(csvCell)
        .join(SEP),
    );
  }
  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function dateStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function writeOutputs({ outputDir, agences, stats, erreurs, date = new Date() }) {
  await mkdir(outputDir, { recursive: true });
  const base = join(outputDir, `agences-${dateStamp(date)}`);
  const csvPath = `${base}.csv`;
  const jsonPath = `${base}.json`;
  await writeFile(csvPath, toCsv(agences), 'utf8');
  const json = {
    genereLe: date.toISOString(),
    stats,
    erreurs,
    agences: agences.map((a) => ({
      plateforme: a.plateforme,
      agence: a.agence,
      id_agence: a.idAgence,
      url_agence: a.urlAgence,
      nb_annonces_location: a.nbAnnoncesLocation,
      zones: a.zones,
      exemples_annonces: a.exemplesAnnonces,
    })),
  };
  await writeFile(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  return { csvPath, jsonPath };
}
