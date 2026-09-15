# Serveurs MCP du dépôt : Perplexity et Playwright

Les deux serveurs sont déclarés dans `.mcp.json` (portée projet) et pré-approuvés
pour ce dépôt via `.claude/settings.json`. Ils sont chargés au démarrage d'une
session Claude Code ouverte sur ce dépôt ; une session déjà en cours doit être
relancée pour les voir.

## 1. Perplexity

Paquet officiel : `@perplexity-ai/mcp-server` (version épinglée 1.2.1).
Outils exposés : `perplexity_search`, `perplexity_ask`, `perplexity_research`,
`perplexity_reason`.

### Clé d'API (obligatoire)

Le serveur lit la variable d'environnement `PERPLEXITY_API_KEY`. La clé ne doit
jamais être écrite dans `.mcp.json` ni commitée.

- En local : `export PERPLEXITY_API_KEY=pplx-...` dans votre shell ou votre
  fichier de profil, avant de lancer `claude`.
- Sur Claude Code web : ajouter la variable dans les paramètres de
  l'environnement (section variables d'environnement), pas dans le dépôt.

La clé se crée sur https://www.perplexity.ai/account/api/group (un crédit API
payant est requis ; l'abonnement Pro seul ne suffit pas).

### Accès réseau

L'environnement d'exécution distant filtre les sorties HTTPS. Au moment de
l'installation, `api.perplexity.ai` était refusé par la politique réseau
(CONNECT 403). Tant que ce domaine n'est pas autorisé, le serveur démarre mais
tout appel d'outil échoue.

Domaines à autoriser dans la politique réseau de l'environnement :

- `api.perplexity.ai` (indispensable)
- `mcp.perplexity.ai` (seulement si vous passez au serveur MCP hébergé de
  Perplexity au lieu du paquet npm)

Documentation de référence : https://code.claude.com/docs/en/claude-code-on-the-web

## 2. Playwright

Paquet : `@playwright/mcp` (version épinglée 0.0.81). Il pilote un navigateur
et expose la navigation, les clics, la saisie, les captures et les snapshots
d'accessibilité.

Configuration retenue : `--headless --isolated --no-sandbox`, plus un chemin de
navigateur explicite.

### Pourquoi `--executable-path`

`@playwright/mcp@0.0.81` embarque `playwright-core` 1.64-alpha, qui attend le
build Chromium 1243. L'image distante fournit le build 1194 et interdit le
téléchargement de navigateurs. Sans chemin explicite, le serveur cherche en plus
Google Chrome dans `/opt/google/chrome/chrome`, absent lui aussi, et renvoie
`Chromium distribution 'chrome' is not found`.

Le chemin utilisé est `${PLAYWRIGHT_CHROMIUM_PATH:-/opt/pw-browsers/chromium}`,
donc :

- environnement distant : valeur par défaut, Chromium 141.0.7390.37 déjà présent ;
- poste local : définir `PLAYWRIGHT_CHROMIUM_PATH` vers votre binaire, par
  exemple le résultat de `node -e "console.log(require('playwright').chromium.executablePath())"`.

### Si vous écrivez aussi des scripts Playwright dans ce dépôt

Épinglez `playwright@1.56.0` : c'est la version dont le build Chromium (1194)
correspond à celui préinstallé dans l'environnement distant. Une version plus
récente déclenchera `npx playwright install`, qui est bloqué. Sinon, passez
`executablePath: '/opt/pw-browsers/chromium'` au lancement.

## Vérification

```bash
claude mcp list
```

Test manuel de Playwright, hors Claude :

```bash
npx -y @playwright/mcp@0.0.81 --headless --isolated --no-sandbox \
  --executable-path /opt/pw-browsers/chromium --help
```

## Ce qui a été testé le 15/09/2026

- Perplexity : démarrage du serveur et `tools/list` sur les 4 outils, OK.
  Appel réel non testé : pas de clé d'API et domaine bloqué par le proxy.
- Playwright : `browser_navigate` exécuté avec succès via le serveur MCP avec
  le chemin Chromium explicite.
