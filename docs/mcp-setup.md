# Serveurs MCP du dépôt : Perplexity et Playwright

Les deux serveurs sont déclarés dans `.mcp.json` (portée projet) et pré-approuvés
pour ce dépôt via `.claude/settings.json`. Ils sont chargés au démarrage d'une
session Claude Code ouverte sur ce dépôt ; une session déjà en cours doit être
relancée pour les voir.

## 1. Perplexity

Serveur distant officiel : `https://api.perplexity.ai/mcp` (transport
Streamable HTTP). Il est déclaré sans identifiant dans `.mcp.json`, donc la
connexion se fait par « Sign in with Perplexity » (OAuth 2.1 avec PKCE et
enregistrement dynamique du client).

Outils exposés : `perplexity_search`, `perplexity_ask`, `perplexity_research`,
`perplexity_reason`.

### Connexion à votre compte (OAuth, pas de clé à stocker)

Dans une session Claude Code ouverte sur ce dépôt, lancer `/mcp`, choisir
`perplexity`, puis s'authentifier. Le navigateur s'ouvre sur Perplexity, vous
vous connectez avec votre compte habituel et vous choisissez l'organisation API
à facturer. Le jeton est géré par le client, rien n'est écrit dans le dépôt.

Point important : l'OAuth authentifie votre compte, mais la consommation reste
facturée à une organisation API Perplexity. Un abonnement Pro seul ne suffit
pas, il faut des crédits API sur l'organisation choisie. La connexion peut
appeler l'API pour cette organisation ; elle ne peut ni créer de clés, ni voir
les soldes, ni administrer l'organisation.

### Variante par clé d'API

Si vous préférez une clé plutôt que l'OAuth, deux options :

- même serveur distant, avec un en-tête :
  `claude mcp add --transport http perplexity https://api.perplexity.ai/mcp --header "Authorization: Bearer $PERPLEXITY_API_KEY"`
- serveur local en stdio : `npx -y @perplexity-ai/mcp-server@1.2.1` avec la
  variable d'environnement `PERPLEXITY_API_KEY`.

Dans les deux cas, la clé ne doit jamais être commitée ; elle se place dans
l'environnement (variables d'environnement de l'environnement Claude Code web,
ou profil shell en local).

### Accès réseau : blocage constaté

L'environnement d'exécution distant filtre les sorties HTTPS. Au 19/09/2026,
tout le domaine Perplexity est refusé par la politique réseau (CONNECT 403) :
`api.perplexity.ai`, `www.perplexity.ai`, `docs.perplexity.ai`. Conséquence :
le serveur MCP se charge, mais tout appel d'outil échoue avec
`Network error while calling Perplexity API: TypeError: fetch failed`.

Deux façons de débloquer :

1. Autoriser `api.perplexity.ai` dans la politique réseau de l'environnement
   (paramètres de l'environnement Claude Code web). Nécessaire pour la config
   de ce dépôt, que ce soit en OAuth ou par clé.
2. Ajouter Perplexity comme connecteur personnalisé sur claude.ai
   (Paramètres, Connecteurs, Ajouter un connecteur personnalisé, URL
   `https://api.perplexity.ai/mcp`, puis authentification OAuth). Les
   connecteurs claude.ai sont appelés depuis l'infrastructure Anthropic et non
   depuis le conteneur, donc ils ne subissent pas ce filtrage ; c'est ainsi que
   Firecrawl atteint des domaines bloqués pour le conteneur. Cette voie ne
   dépend pas de `.mcp.json`.

Références : https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server
et https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp

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

### Projet de tests Playwright dans ce dépôt

Le dépôt contient un projet `@playwright/test` généré par
`npm init playwright@latest` : `package.json`, `playwright.config.ts`,
`tests/example.spec.ts`, `.gitignore`.

L'étape de téléchargement des navigateurs échoue dans l'environnement distant :
`cdn.playwright.dev`, `playwright.download.prss.microsoft.com` et
`playwright.dev` sont refusés par le proxy. `@playwright/test` 1.63 réclame le
build Chromium 1243, seul le 1194 est présent.

`playwright.config.ts` contourne cela en pointant le projet `chromium` sur le
binaire existant :

- `PLAYWRIGHT_CHROMIUM_PATH` si la variable est définie ;
- sinon `/opt/pw-browsers/chromium` s'il existe ;
- sinon comportement Playwright par défaut, donc rien à changer en local.

Commandes : `npm test` (équivaut à `playwright test`) et `npm run test:ui`.

Les deux tests générés d'origine dans `tests/example.spec.ts` visent
`https://playwright.dev/` et échouent ici en `ERR_TUNNEL_CONNECTION_FAILED`,
faute d'accès réseau sortant vers ce domaine. Ce n'est pas un défaut
d'installation.

## Vérification

```bash
claude mcp list
```

Test manuel de Playwright, hors Claude :

```bash
npx -y @playwright/mcp@0.0.81 --headless --isolated --no-sandbox \
  --executable-path /opt/pw-browsers/chromium --help
```

## Journal des vérifications

15/09/2026 :

- Perplexity (paquet stdio) : démarrage du serveur et `tools/list` sur les
  4 outils, OK. Appel réel non testé.
- Playwright : `browser_navigate` exécuté avec succès via le serveur MCP avec
  le chemin Chromium explicite.

19/09/2026 :

- `npm init playwright@latest` : scaffolding créé, installation des navigateurs
  en échec (domaines de téléchargement bloqués).
- Après pointage explicite sur `/opt/pw-browsers/chromium`, un test local sans
  réseau passe en 11,9 s sur le projet `chromium`.
- Les tests d'exemple vers `playwright.dev` échouent : domaine bloqué.
- Les outils `perplexity_*` sont bien chargés dans la session, mais
  `perplexity_search` renvoie `fetch failed` : aucune clé dans l'environnement
  et `api.perplexity.ai` refusé par le proxy (CONNECT 403).
- Bascule de `.mcp.json` vers le serveur distant officiel
  `https://api.perplexity.ai/mcp` en OAuth, pour se connecter au compte
  Perplexity sans stocker de clé.
