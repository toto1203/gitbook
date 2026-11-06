// Pilotage direct de Camoufox (Firefox anti-détection, https://github.com/daijro/camoufox)
// via camoufox-js et playwright-core, sans serveur intermédiaire.
//
// Modèle : un seul navigateur lancé pour toute l'exécution, un seul contexte (cookies et stockage
// partagés, identité fr-FR / Europe/Paris sauf si un proxy impose la géolocalisation de son IP),
// et un nouvel onglet (page Playwright) par plateforme. L'interface exposée aux plateformes est
// volontairement minimale : navigate, wait, evaluate, snapshot, close.
//
// Le binaire Camoufox doit avoir été téléchargé au préalable : `npm run fetch-browser`
// (équivaut à `npx camoufox-js fetch`, cache dans ~/.cache/camoufox ou $CAMOUFOX_INSTALL_DIR).

export class BrowserError extends Error {
  constructor(message, { cause = null, tabGone = false } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'BrowserError';
    this.tabGone = tabGone;
  }
}

/** Messages Playwright signalant qu'une page, un contexte ou le navigateur a disparu. */
const GONE_RE = /Target (page, context or browser )?(has been )?closed|Browser has been closed|Page closed|Page crashed|browser has disconnected|Target crashed/i;

export function isGoneError(err) {
  return GONE_RE.test(err?.message || '');
}

/**
 * Boutons de bandeaux de consentement connus (repris de camofox-browser, plus Didomi, très
 * présent sur les sites français dont Leboncoin). Limité aux gestionnaires de consentement pour
 * ne pas fermer d'autres éléments de la page.
 */
export const CONSENT_SELECTORS = [
  '#didomi-notice-agree-button',
  '#onetrust-banner-sdk #onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#qc-cmp2-ui button[mode="primary"]',
];

/** Normalise l'option proxy de la configuration en objet Playwright { server, username?, password? } ou null. */
export function normalizeProxy(proxy) {
  if (!proxy) return null;
  if (typeof proxy === 'string') return { server: proxy };
  if (typeof proxy !== 'object' || !proxy.server) return null;
  const out = { server: String(proxy.server) };
  if (proxy.username) out.username = String(proxy.username);
  if (proxy.password) out.password = String(proxy.password);
  return out;
}

/**
 * Options passées à Camoufox (camoufox-js) et au contexte Playwright.
 * Sans proxy : identité française fixe. Avec proxy : geoip activé, Camoufox déduit langue,
 * fuseau et géolocalisation de l'IP de sortie (comme le faisait camofox-browser).
 */
export function buildLaunchConfig({ headless = true, proxy = null, humanize = true, locale = 'fr-FR', timezoneId = 'Europe/Paris', geoip } = {}) {
  const p = normalizeProxy(proxy);
  const useGeoip = geoip ?? !!p;
  const camoufox = {
    headless,
    humanize,
    os: hostOs(),
    enable_cache: true,
  };
  if (p) camoufox.proxy = p;
  if (useGeoip) camoufox.geoip = true;
  else camoufox.locale = locale;
  const context = useGeoip ? {} : { locale, timezoneId };
  return { camoufox, context };
}

/** Empreinte cohérente avec le système hôte (même choix que camofox-browser). */
function hostOs() {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  return 'linux';
}

/** Lanceur réel : import différé pour que les tests n'aient pas besoin du binaire. */
async function defaultLauncher(camoufoxOptions) {
  let mod;
  try {
    mod = await import('camoufox-js');
  } catch (err) {
    throw new BrowserError(`camoufox-js introuvable : lancer "npm install" (${err.message})`, { cause: err });
  }
  return mod.Camoufox(camoufoxOptions);
}

export class Tab {
  constructor(page, { navigationTimeoutMs, log }) {
    this.page = page;
    this.navigationTimeoutMs = navigationTimeoutMs;
    this.log = log;
  }

  get closed() {
    return this.page.isClosed();
  }

  async #guard(what, fn) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BrowserError) throw err;
      const gone = this.page.isClosed() || isGoneError(err);
      throw new BrowserError(`${what} : ${err.message}`, { cause: err, tabGone: gone });
    }
  }

  /** Navigue vers url. Renvoie { url, httpStatus, navigationOk } (même forme qu'avant). */
  navigate(url) {
    return this.#guard(`navigation vers ${url}`, async () => {
      const res = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.navigationTimeoutMs });
      const httpStatus = res ? res.status() : null;
      return { url: this.page.url(), httpStatus, navigationOk: httpStatus === null || httpStatus < 400 };
    });
  }

  /**
   * Attend le chargement : domcontentloaded, puis réseau calme (au plus 5 s, sans erreur si le
   * site garde des connexions ouvertes), puis clic éventuel sur un bandeau de consentement.
   */
  wait({ timeout = 10_000, waitForNetwork = true, dismissConsent = false } = {}) {
    return this.#guard('attente de chargement', async () => {
      await this.page.waitForLoadState('domcontentloaded', { timeout });
      if (waitForNetwork) {
        await this.page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 5_000) }).catch(() => {});
      }
      if (dismissConsent) await this.dismissConsent();
      return { ok: true, ready: true };
    });
  }

  async dismissConsent() {
    for (const selector of CONSENT_SELECTORS) {
      try {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 100 })) {
          await button.click({ timeout: 2_000 });
          this.log(`  bandeau de consentement fermé (${selector})`);
          await this.page.waitForTimeout(300);
          return true;
        }
      } catch {
        // bouton absent ou non cliquable : sélecteur suivant
      }
    }
    return false;
  }

  /** Évalue une expression JS (chaîne, IIFE éventuellement asynchrone) dans la page. */
  evaluate(expression) {
    return this.#guard('évaluation dans la page', () => this.page.evaluate(expression));
  }

  /** Instantané de diagnostic : URL, titre et HTML complet de la page. */
  snapshot() {
    return this.#guard('instantané', async () => ({
      url: this.page.url(),
      title: await this.page.title().catch(() => ''),
      html: await this.page.content(),
    }));
  }

  async close() {
    if (!this.page.isClosed()) await this.page.close().catch(() => {});
  }
}

export class Browser {
  /**
   * @param {object} opts
   * @param {boolean|'virtual'} [opts.headless] true par défaut ; 'virtual' = écran virtuel Xvfb (Linux)
   * @param {object|string|null} [opts.proxy] { server, username?, password? }
   * @param {boolean|number} [opts.humanize] mouvements de souris humanisés (durée max en s si nombre)
   * @param {string} [opts.locale] / [opts.timezoneId] identité utilisée sans proxy
   * @param {boolean} [opts.geoip] force/désactive la géolocalisation par IP (défaut : activée si proxy)
   * @param {number} [opts.navigationTimeoutMs]
   * @param {(camoufoxOptions: object) => Promise<object>} [opts.launcher] injectable pour les tests ;
   *        doit renvoyer un objet de type Browser Playwright (newContext, close)
   */
  constructor({ launcher = defaultLauncher, navigationTimeoutMs = 45_000, log = () => {}, ...identity } = {}) {
    this.launcher = launcher;
    this.navigationTimeoutMs = navigationTimeoutMs;
    this.log = log;
    this.config = buildLaunchConfig(identity);
    this.browser = null;
    this.context = null;
  }

  async start() {
    if (this.context) return this;
    try {
      this.browser = await this.launcher(this.config.camoufox);
    } catch (err) {
      if (err instanceof BrowserError) throw err;
      throw new BrowserError(`lancement de Camoufox impossible : ${err.message}\nTélécharger le navigateur : npm run fetch-browser`, { cause: err });
    }
    try {
      this.context = await this.browser.newContext(this.config.context);
    } catch (err) {
      await this.close();
      throw new BrowserError(`création du contexte navigateur impossible : ${err.message}`, { cause: err });
    }
    return this;
  }

  /** Ouvre un nouvel onglet ; relance navigateur et contexte s'ils ont disparu. */
  async newTab() {
    if (!this.context) await this.start();
    let page;
    try {
      page = await this.context.newPage();
    } catch (err) {
      if (!isGoneError(err)) throw new BrowserError(`ouverture d'onglet impossible : ${err.message}`, { cause: err });
      this.log('  navigateur perdu, relance de Camoufox');
      await this.close();
      await this.start();
      page = await this.context.newPage();
    }
    return new Tab(page, { navigationTimeoutMs: this.navigationTimeoutMs, log: this.log });
  }

  async close() {
    const { context, browser } = this;
    this.context = null;
    this.browser = null;
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
