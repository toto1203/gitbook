// Teste src/browser.js avec un faux lanceur reproduisant la surface Playwright utilisée
// (Browser.newContext/close, BrowserContext.newPage/close, Page.goto/evaluate/...).
// Aucun binaire Camoufox n'est nécessaire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Browser, BrowserError, buildLaunchConfig, normalizeProxy } from '../src/browser.js';

function fakePlaywright({ status = 200, evaluateImpl = (e) => ({ echo: e }), visibleSelector = null } = {}) {
  const calls = { launch: [], contexts: [], pages: [], goto: [], evaluate: [], clicks: [], loadStates: [] };
  const makePage = () => {
    let closed = false;
    let url = 'about:blank';
    const page = {
      isClosed: () => closed,
      url: () => url,
      async goto(u, opts) {
        if (closed) throw new Error('Target page, context or browser has been closed');
        calls.goto.push({ url: u, opts });
        url = u;
        return { status: () => status };
      },
      async waitForLoadState(state) {
        calls.loadStates.push(state);
      },
      async waitForTimeout() {},
      locator(selector) {
        return {
          first: () => ({
            isVisible: async () => selector === visibleSelector,
            click: async () => calls.clicks.push(selector),
          }),
        };
      },
      async evaluate(expression) {
        if (closed) throw new Error('Target page, context or browser has been closed');
        calls.evaluate.push(expression);
        return evaluateImpl(expression);
      },
      async title() {
        return 'Titre';
      },
      async content() {
        return '<html><body>ok</body></html>';
      },
      async close() {
        closed = true;
      },
      crash() {
        closed = true;
      },
    };
    calls.pages.push(page);
    return page;
  };
  const launcher = async (options) => {
    calls.launch.push(options);
    let browserClosed = false;
    return {
      async newContext(ctxOptions) {
        calls.contexts.push(ctxOptions);
        return {
          async newPage() {
            if (browserClosed) throw new Error('Target page, context or browser has been closed');
            return makePage();
          },
          async close() {},
        };
      },
      async close() {
        browserClosed = true;
      },
      kill() {
        browserClosed = true;
      },
    };
  };
  return { calls, launcher };
}

test('navigateur : options de lancement sans proxy (identité française fixe)', () => {
  const { camoufox, context } = buildLaunchConfig({});
  assert.equal(camoufox.headless, true);
  assert.equal(camoufox.humanize, true);
  assert.equal(camoufox.locale, 'fr-FR');
  assert.equal(camoufox.geoip, undefined);
  assert.equal(camoufox.proxy, undefined);
  assert.deepEqual(context, { locale: 'fr-FR', timezoneId: 'Europe/Paris' });
});

test('navigateur : avec proxy, geoip activé et identité déduite de l\'IP', () => {
  const { camoufox, context } = buildLaunchConfig({
    headless: 'virtual',
    proxy: { server: 'http://p.example:8000', username: 'u', password: 's' },
  });
  assert.equal(camoufox.headless, 'virtual');
  assert.deepEqual(camoufox.proxy, { server: 'http://p.example:8000', username: 'u', password: 's' });
  assert.equal(camoufox.geoip, true);
  assert.equal(camoufox.locale, undefined);
  assert.deepEqual(context, {});
  assert.deepEqual(normalizeProxy('socks5://h:1080'), { server: 'socks5://h:1080' });
  assert.equal(normalizeProxy({}), null);
});

test('navigateur : un lancement, un contexte, un onglet par appel', async () => {
  const { calls, launcher } = fakePlaywright({ visibleSelector: '#didomi-notice-agree-button' });
  const b = new Browser({ launcher });
  await b.start();
  await b.start(); // idempotent
  const tab = await b.newTab();
  const nav = await tab.navigate('https://example.com/a');
  assert.deepEqual(nav, { url: 'https://example.com/a', httpStatus: 200, navigationOk: true });
  assert.equal(calls.goto[0].opts.waitUntil, 'domcontentloaded');
  assert.deepEqual(await tab.wait({ dismissConsent: true }), { ok: true, ready: true });
  assert.deepEqual(calls.loadStates, ['domcontentloaded', 'networkidle']);
  assert.deepEqual(calls.clicks, ['#didomi-notice-agree-button']);
  assert.deepEqual(await tab.evaluate('(() => 1 + 1)()'), { echo: '(() => 1 + 1)()' });
  const snap = await tab.snapshot();
  assert.equal(snap.url, 'https://example.com/a');
  assert.match(snap.html, /<body>ok<\/body>/);
  const tab2 = await b.newTab();
  assert.notEqual(tab2.page, tab.page);
  await tab.close();
  assert.equal(tab.closed, true);
  await b.close();
  assert.equal(calls.launch.length, 1);
  assert.equal(calls.contexts.length, 1);
  assert.deepEqual(calls.contexts[0], { locale: 'fr-FR', timezoneId: 'Europe/Paris' });
});

test('navigateur : statut HTTP 403 remonté, onglet fermé signalé tabGone', async () => {
  const { calls, launcher } = fakePlaywright({ status: 403 });
  const b = new Browser({ launcher });
  const tab = await b.newTab(); // démarre le navigateur à la demande
  const nav = await tab.navigate('https://example.com');
  assert.equal(nav.httpStatus, 403);
  assert.equal(nav.navigationOk, false);
  calls.pages[0].crash();
  await assert.rejects(tab.evaluate('1'), (err) => err instanceof BrowserError && err.tabGone === true);
  await b.close();
});

test('navigateur : erreur de script dans la page non marquée tabGone', async () => {
  const { launcher } = fakePlaywright({
    evaluateImpl: () => {
      throw new Error('ReferenceError: x is not defined');
    },
  });
  const b = new Browser({ launcher });
  const tab = await b.newTab();
  await assert.rejects(tab.evaluate('x'), (err) => err instanceof BrowserError && err.tabGone === false && /x is not defined/.test(err.message));
  await b.close();
});

test('navigateur : relance si le navigateur a disparu', async () => {
  const { calls, launcher } = fakePlaywright();
  const logs = [];
  const b = new Browser({ launcher, log: (m) => logs.push(m) });
  await b.start();
  await b.browser.kill();
  const tab = await b.newTab();
  assert.ok(tab);
  assert.equal(calls.launch.length, 2);
  assert.ok(logs.some((m) => /relance/.test(m)));
  await b.close();
});

test('navigateur : échec de lancement -> message explicite', async () => {
  const b = new Browser({
    launcher: async () => {
      throw new Error('Camoufox is not installed');
    },
  });
  await assert.rejects(b.start(), (err) => err instanceof BrowserError && /npm run fetch-browser/.test(err.message));
});
