import * as leboncoin from './leboncoin.js';
import * as seloger from './seloger.js';
import * as bienici from './bienici.js';

// PAP (pap.fr) est volontairement absent : site "de particulier à particulier" où les
// agences n'ont pas le droit de publier ; il ne peut donc pas contenir d'annonces d'agences.
export const PLATFORMS = { leboncoin, seloger, bienici };
