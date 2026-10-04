// Teste le client camofox contre un faux serveur HTTP local reproduisant les formes de
// requêtes/réponses de camofox-browser (server.js).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { CamofoxClient, CamofoxError } from '../src/camofox.js';

const calls = [];
let flaky = 0;
let server;
let baseUrl;

before(async () => {
  server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const json = body ? JSON.parse(body) : null;
    const url = new URL(req.url, 'http://x');
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: json, auth: req.headers.authorization });
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true, engine: 'camoufox' });
    if (req.method === 'POST' && url.pathname === '/tabs') {
      if (!json?.userId || !json?.sessionKey) return send(400, { error: 'userId and sessionKey required' });
      return send(200, { tabId: 'tab-1', url: json.url || 'about:blank', httpStatus: null, navigationOk: true });
    }
    if (req.method === 'POST' && url.pathname === '/tabs/tab-1/navigate') {
      if (flaky-- > 0) return send(503, { error: 'Browser session expired' });
      return send(200, { ok: true, tabId: 'tab-1', url: json.url, httpStatus: 200, navigationOk: true });
    }
    if (req.method === 'POST' && url.pathname === '/tabs/tab-1/wait') return send(200, { ok: true, ready: true });
    if (req.method === 'POST' && url.pathname === '/tabs/tab-1/evaluate') return send(200, { ok: true, result: { echo: json.expression } });
    if (req.method === 'GET' && url.pathname === '/tabs/tab-1/snapshot') return send(200, { url: 'https://x', snapshot: '- heading "x"' });
    if (req.method === 'DELETE') return send(200, { ok: true });
    return send(404, { error: 'Tab not found' });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('client camofox : formes des requêtes', async () => {
  const c = new CamofoxClient({ baseUrl, userId: 'u1', accessKey: 'k', retryDelayMs: 1 });
  assert.equal((await c.health()).ok, true);
  const tab = await c.createTab({ sessionKey: 's1', url: 'https://example.com' });
  assert.equal(tab.tabId, 'tab-1');
  await c.navigate('tab-1', 'https://example.com/2');
  await c.wait('tab-1', { dismissConsent: true });
  assert.deepEqual(await c.evaluate('tab-1', '1+1'), { echo: '1+1' });
  assert.equal((await c.snapshot('tab-1')).snapshot, '- heading "x"');
  await c.closeTab('tab-1');
  await c.closeSession();

  const find = (m, p) => calls.find((x) => x.method === m && x.path === p);
  assert.deepEqual(find('POST', '/tabs').body, { userId: 'u1', sessionKey: 's1', url: 'https://example.com' });
  assert.deepEqual(find('POST', '/tabs/tab-1/navigate').body, { userId: 'u1', url: 'https://example.com/2' });
  assert.deepEqual(find('POST', '/tabs/tab-1/wait').body, { userId: 'u1', timeout: 10000, waitForNetwork: true, dismissConsent: true });
  assert.deepEqual(find('POST', '/tabs/tab-1/evaluate').body, { userId: 'u1', expression: '1+1' });
  assert.deepEqual(find('GET', '/tabs/tab-1/snapshot').query, { userId: 'u1' });
  assert.deepEqual(find('DELETE', '/tabs/tab-1').query, { userId: 'u1' });
  assert.ok(find('DELETE', '/sessions/u1'));
  assert.equal(find('POST', '/tabs').auth, 'Bearer k');
});

test('client camofox : nouvelle tentative sur 503, pas sur 404', async () => {
  const c = new CamofoxClient({ baseUrl, userId: 'u1', retries: 2, retryDelayMs: 1 });
  flaky = 2;
  const r = await c.navigate('tab-1', 'https://example.com');
  assert.equal(r.ok, true);
  await assert.rejects(c.navigate('inconnu', 'https://example.com'), (err) => err instanceof CamofoxError && err.status === 404 && err.tabGone);
});

test('client camofox : serveur injoignable -> CamofoxError', async () => {
  const c = new CamofoxClient({ baseUrl: 'http://127.0.0.1:1', userId: 'u1', retries: 1, retryDelayMs: 1, timeoutMs: 2000 });
  await assert.rejects(c.health(), /camofox injoignable/);
});
