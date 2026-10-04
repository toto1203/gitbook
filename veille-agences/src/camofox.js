// Client minimal pour l'API REST de camofox-browser (https://github.com/jo-inc/camofox-browser).
//
// Routes utilisées (vérifiées dans server.js / openapi.json du dépôt camofox) :
//   GET    /health                      -> { ok, engine, browserRunning, ... }
//   POST   /tabs                        body { userId, sessionKey, url? } -> { tabId, url, httpStatus, navigationOk }
//   POST   /tabs/:tabId/navigate        body { userId, url }              -> { ok, tabId, url, httpStatus, navigationOk }
//   POST   /tabs/:tabId/wait            body { userId, timeout, waitForNetwork, dismissConsent } -> { ok, ready }
//                                      (le champ "selector" figure dans l'OpenAPI mais n'est PAS lu par le serveur)
//   POST   /tabs/:tabId/evaluate        body { userId, expression }       -> { ok, result }
//                                      (exécuté via Playwright page.evaluate(expression) : on envoie une IIFE)
//   GET    /tabs/:tabId/snapshot?userId=...[&offset=N] -> { url, snapshot, truncated, hasMore, nextOffset, ... }
//   DELETE /tabs/:tabId?userId=...      -> { ok }
//   DELETE /sessions/:userId            -> { ok }
//
// Sémantique : un "userId" correspond à un contexte navigateur isolé (cookies, stockage) ;
// "sessionKey" regroupe des onglets dans ce contexte. Les erreurs sont renvoyées en JSON { error, code? }.
// Si CAMOFOX_ACCESS_KEY est défini côté serveur, toutes les routes exigent "Authorization: Bearer <clé>".

const RETRYABLE_STATUS = new Set([409, 429, 500, 502, 503, 504]);

export class CamofoxError extends Error {
  constructor(message, { status = null, code = null, body = null } = {}) {
    super(message);
    this.name = 'CamofoxError';
    this.status = status;
    this.code = code;
    this.body = body;
  }

  /** L'onglet n'existe plus (fermé pour inactivité, navigateur redémarré, page plantée). */
  get tabGone() {
    return this.status === 404 || this.status === 410;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class CamofoxClient {
  /**
   * @param {object} opts
   * @param {string} [opts.baseUrl] URL du serveur camofox (défaut http://localhost:9377)
   * @param {string} opts.userId identifiant de session camofox (contexte navigateur isolé)
   * @param {string} [opts.accessKey] valeur de CAMOFOX_ACCESS_KEY si le serveur en exige une
   * @param {number} [opts.timeoutMs] délai max par requête HTTP
   * @param {number} [opts.retries] nombre de nouvelles tentatives sur erreur transitoire
   * @param {number} [opts.retryDelayMs] délai de base entre tentatives (croissance linéaire)
   * @param {typeof fetch} [opts.fetchImpl] injectable pour les tests
   */
  constructor({
    baseUrl = 'http://localhost:9377',
    userId,
    accessKey = null,
    timeoutMs = 60_000,
    retries = 2,
    retryDelayMs = 2_000,
    fetchImpl = globalThis.fetch,
    log = () => {},
  } = {}) {
    if (!userId) throw new Error('CamofoxClient : userId obligatoire');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.userId = userId;
    this.accessKey = accessKey;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.retryDelayMs = retryDelayMs;
    this.fetchImpl = fetchImpl;
    this.log = log;
  }

  async request(method, path, { body, query, timeoutMs = this.timeoutMs, retries = this.retries } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.accessKey) headers.Authorization = `Bearer ${this.accessKey}`;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const wait = this.retryDelayMs * attempt;
        this.log(`camofox : nouvelle tentative ${attempt}/${retries} pour ${method} ${path} dans ${wait} ms`);
        await sleep(wait);
      }
      let res;
      try {
        res = await this.fetchImpl(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        // Erreur réseau ou délai dépassé : on retente.
        lastErr = new CamofoxError(`camofox injoignable (${method} ${path}) : ${err.message}`, { code: err.name });
        continue;
      }
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (res.ok) return data;
      const err = new CamofoxError(
        `camofox ${method} ${path} -> HTTP ${res.status} : ${data?.error || text.slice(0, 200)}`,
        { status: res.status, code: data?.code ?? null, body: data },
      );
      if (!RETRYABLE_STATUS.has(res.status)) throw err;
      lastErr = err;
    }
    throw lastErr;
  }

  health() {
    return this.request('GET', '/health', { retries: 0, timeoutMs: 10_000 });
  }

  /** Crée un onglet (et navigue vers url si fournie). Renvoie { tabId, url, httpStatus, navigationOk }. */
  createTab({ sessionKey = 'default', url } = {}) {
    const body = { userId: this.userId, sessionKey };
    if (url) body.url = url;
    return this.request('POST', '/tabs', { body });
  }

  /** Renvoie { ok, tabId, url, httpStatus, navigationOk }. */
  navigate(tabId, url) {
    return this.request('POST', `/tabs/${encodeURIComponent(tabId)}/navigate`, {
      body: { userId: this.userId, url },
    });
  }

  /** Attend domcontentloaded + réseau calme ; dismissConsent clique les bandeaux OneTrust/Cookiebot/Quantcast connus. */
  wait(tabId, { timeout = 10_000, waitForNetwork = true, dismissConsent = false } = {}) {
    return this.request('POST', `/tabs/${encodeURIComponent(tabId)}/wait`, {
      body: { userId: this.userId, timeout, waitForNetwork, dismissConsent },
    });
  }

  /** Évalue une expression JS dans la page et renvoie directement le résultat sérialisé. */
  async evaluate(tabId, expression) {
    const data = await this.request('POST', `/tabs/${encodeURIComponent(tabId)}/evaluate`, {
      body: { userId: this.userId, expression },
    });
    return data?.result;
  }

  /** Instantané d'accessibilité (texte) de la page ; utile pour diagnostiquer un blocage. */
  snapshot(tabId, { offset } = {}) {
    return this.request('GET', `/tabs/${encodeURIComponent(tabId)}/snapshot`, {
      query: { userId: this.userId, offset },
    });
  }

  closeTab(tabId) {
    return this.request('DELETE', `/tabs/${encodeURIComponent(tabId)}`, {
      query: { userId: this.userId },
      retries: 0,
    });
  }

  closeSession() {
    return this.request('DELETE', `/sessions/${encodeURIComponent(this.userId)}`, { retries: 0 });
  }
}
