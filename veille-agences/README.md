# Veille agences : agences immobilières à plus de 10 annonces de location

Outil interne Greenloc. Il repère les **agences immobilières** qui ont **strictement plus de 10 annonces de location** en ligne **sur une même plateforme** (Leboncoin, SeLoger, Bien'ici), pour une liste de zones géographiques.

Le navigateur utilisé est [Camoufox](https://github.com/daijro/camoufox) (licence MPL-2.0), un Firefox modifié pour résister à la détection des robots. Il est piloté directement depuis Node.js avec [camoufox-js](https://www.npmjs.com/package/camoufox-js) et `playwright-core` : aucun serveur intermédiaire, aucun Docker.

## Sommaire

1. [Objectif](#objectif)
2. [Prérequis](#prérequis)
3. [Installation](#installation)
4. [État du projet Camoufox](#état-du-projet-camoufox)
5. [Configuration](#configuration)
6. [Exécution](#exécution)
7. [Format de sortie](#format-de-sortie)
8. [Fonctionnement](#fonctionnement)
9. [Validation des parseurs sur pages réelles](#validation-des-parseurs-sur-pages-réelles)
10. [Limites](#limites)
11. [Risques juridiques](#risques-juridiques)
12. [Dépannage](#dépannage)

## Objectif

Pour chaque plateforme et chaque zone configurée, le script parcourt les pages de résultats de recherche "location" et collecte, pour chaque annonce : identifiant, URL, agence (identifiant, nom, URL) et type d'annonceur (pro ou particulier). Il dédoublonne ensuite les annonces, les compte par agence **plateforme par plateforme** (une agence à 6 annonces sur Leboncoin et 6 sur SeLoger n'est **pas** retenue) et ne garde que les agences dont le total est **strictement supérieur** au seuil (10 par défaut).

**PAP est exclu** : PAP.fr est un site "de particulier à particulier" ; ses conditions interdisent la publication d'annonces par des professionnels, agences comprises. Il ne peut donc, par construction, contenir d'annonces d'agences et n'apporterait rien à cette recherche.

## Prérequis

- **Node.js 22 ou plus** (Linux, macOS ou Windows).
- Dépendances npm : `camoufox-js` (lanceur Camoufox, port JavaScript du lanceur Python officiel, maintenu par Apify) et `playwright-core` (pilotage du navigateur).
- Environ 1 Go de disque pour le navigateur Camoufox et ses données (cache utilisateur) et 1 à 2 Go de RAM libre.
- Sous Linux sans affichage, rien de plus pour le mode `headless: true`. Le mode `"virtual"` (écran virtuel, parfois moins détecté) demande `Xvfb` (`apt install xvfb`).

### Où l'exécuter ? Recommandation : un poste local

- **Le plus simple** : `npm install`, `npm run fetch-browser`, et c'est prêt.
- **Gratuit** : aucun serveur à louer.
- **Adresse IP résidentielle** : Leboncoin et SeLoger sont protégés par DataDome, qui bloque très vite les IP de centres de données (AWS, OVH, Scaleway, etc.). Depuis une connexion de bureau ou domestique, le blocage est beaucoup plus rare.

Si le blocage persiste malgré tout, il faudra un **proxy résidentiel** (payant : Decodo, Bright Data, Oxylabs...). Le renseigner dans `browser.proxy` de `config.json` (voir [Configuration](#configuration)). Avec un proxy, Camoufox active sa géolocalisation par IP (`geoip`) : langue, fuseau horaire et position sont alors déduits de l'IP de sortie du proxy, au lieu de l'identité fixe `fr-FR` / `Europe/Paris`. Choisir donc un proxy situé en France.

## Installation

```bash
cd veille-agences
npm install                          # camoufox-js et playwright-core
npm run fetch-browser                # télécharge le navigateur Camoufox (une seule fois)
cp config.example.json config.json   # puis adapter config.json
npm test                             # tests unitaires (facultatif, sans navigateur)
```

`npm run fetch-browser` exécute `camoufox-js fetch` : il télécharge depuis les publications GitHub de Camoufox **la version du navigateur associée à cette version de camoufox-js** (camoufox-js 0.13.0 : Camoufox 152.0.4-beta.30, la même version que celle testée par camofox-browser), la base GeoIP et les extensions par défaut (dont uBlock Origin). Le tout est rangé dans le cache utilisateur (`~/.cache/camoufox` sous Linux) ; la variable `CAMOUFOX_INSTALL_DIR` permet de choisir un autre dossier (à définir aussi lors des exécutions). `npx camoufox-js path` affiche le dossier utilisé, `npx camoufox-js remove` le supprime. Sur une machine partagée ou un CI, définir `GITHUB_TOKEN` évite la limite de requêtes de l'API GitHub.

Les versions de `camoufox-js` (0.13.0) et `playwright-core` (1.62.1, celle du verrou de camofox-browser ; camoufox-js exige une version inférieure à 1.63) sont figées dans `package.json`. Chaque version de camoufox-js est associée à une version précise du navigateur : monter camoufox-js change donc le navigateur téléchargé, ce qui est à revalider avant usage.

## État du projet Camoufox

Constat au 6 novembre 2026, à revérifier avant usage :

- Le README du dépôt [daijro/camoufox](https://github.com/daijro/camoufox) affiche toujours l'avertissement : *"This project is under development. It may not be suitable for stable production use."*
- Le site officiel ([camoufox.com/stealth](https://camoufox.com/stealth/)) indique : *"There has been a year gap in maintenance due to a personal situation. Camoufox has gone down in performance due to the base Firefox version and newly discovered fingerprint inconsistencies"*, puis *"Camoufox is currently under active development."*
- Le 10 janvier 2026, l'auteur (daijro) a annoncé quitter son rôle de mainteneur principal ; la maintenance est assurée par l'équipe de Clover Labs, le dépôt restant la propriété de daijro ([discussion #452](https://github.com/daijro/camoufox/discussions/452)).
- Le développement est effectivement actif : de 11 à plus de 170 commits par mois sur le dépôt en 2026 (dernier commit consulté : 3 novembre 2026 ; passage à Firefox 159 le 2 novembre).
- Le dépôt officiel publie désormais son propre lanceur Node.js, le paquet npm [`camoufox`](https://www.npmjs.com/package/camoufox) (0.5.9 au 1er novembre 2026, `npm install camoufox playwright-core && npx camoufox fetch`). Cet outil utilise `camoufox-js` (Apify, [apify/camoufox-js](https://github.com/apify/camoufox-js), 0.13.0 au 16 octobre 2026), comme camofox-browser ; les deux exposent une fonction `Camoufox()` qui renvoie un navigateur Playwright, et basculer de l'un à l'autre ne toucherait que `src/browser.js` et `package.json`.

En pratique : l'efficacité anti-détection n'est pas garantie et peut varier d'une version à l'autre ; prévoir de revalider après chaque mise à jour.

## Configuration

Fichier `config.json` (modèle : `config.example.json`) :

| Clé | Description | Défaut |
|-----|-------------|--------|
| `browser.headless` | `true` (sans fenêtre), `false` (fenêtre visible, utile pour observer) ou `"virtual"` (écran virtuel Xvfb, Linux) | `true` |
| `browser.humanize` | Mouvements de souris humanisés (`true`, `false` ou durée max en secondes) | `true` |
| `browser.proxy` | Proxy : `{ "server": "http://hote:port", "username": "...", "password": "..." }` (ou `socks5://...`) | `null` |
| `browser.locale` / `browser.timezoneId` | Identité utilisée sans proxy | `fr-FR` / `Europe/Paris` |
| `browser.geoip` | Forcer (`true`) ou désactiver (`false`) la géolocalisation par IP | activée si proxy |
| `platforms` | Plateformes actives : `{ "leboncoin": true, "seloger": true, "bienici": true }` | toutes |
| `zones` | Liste des zones (voir ci-dessous) | obligatoire |
| `filters.typeBien` | Types de biens : `appartement`, `maison`, `parking`, `terrain`... (vide = tous) | `[]` |
| `filters.prixMax` | Loyer maximum en euros (facultatif) | `null` |
| `filters.surfaceMin` | Surface minimale en m² (facultatif) | `null` |
| `seuilAnnonces` | Seuil **strict** : agence retenue si nombre d'annonces > seuil | `10` |
| `maxPages` | Nombre maximum de pages de résultats par zone et par plateforme | `20` |
| `delays.minMs` / `delays.maxMs` | Pause aléatoire entre deux chargements de page (minimum imposé : 1000 ms) | `4000` / `9000` |
| `outputDir` | Dossier de sortie | `output` |

Les anciennes clés `camofoxUrl`, `userId` et `accessKey` (version camofox-browser) sont refusées avec un message explicite : les retirer.

Exemple avec proxy résidentiel :

```json
"browser": {
  "headless": true,
  "humanize": true,
  "proxy": { "server": "http://fr.proxy.example:8000", "username": "utilisateur", "password": "secret" }
}
```

Ne pas versionner `config.json` s'il contient des identifiants de proxy (il est déjà dans `.gitignore`).

**Attention aux filtres** : `prixMax`, `surfaceMin` et `typeBien` réduisent le nombre d'annonces vues, donc le compte par agence. Pour mesurer le volume réel d'une agence, laisser ces filtres vides.

### Zones

Chaque zone a un `label` (repris dans le fichier de sortie), une `ville` et/ou un `codePostal`, et éventuellement des identifiants propres à chaque plateforme :

```json
{
  "label": "Lyon",
  "ville": "Lyon",
  "codePostal": "69000",
  "leboncoin": { "locations": "Lyon_69000" },
  "seloger":   { "searchUrl": "https://www.seloger.com/classified-search?distributionTypes=Rent&locations=..." },
  "bienici":   { "zoneIds": ["-120965"] }
}
```

- **Leboncoin** : sans précision, le script construit `locations=Ville_CodePostal`. On peut forcer `leboncoin.locations` (ex. `d_69` pour tout le Rhône) ou coller une URL de recherche complète dans `leboncoin.searchUrl` (seul le paramètre `page` est alors modifié).
- **SeLoger** : le code de localisation de SeLoger ne se déduit pas du code postal. Faire la recherche une fois à la main sur seloger.com (Louer, ville, types de biens), puis copier l'URL de la page de résultats dans `seloger.searchUrl`. Alternative : `seloger.locations` avec le code seul. Une zone sans l'un ou l'autre est signalée en erreur pour SeLoger et ignorée.
- **Bien'ici** : les `zoneIds` sont résolus automatiquement à partir de la ville ou du code postal (service de suggestion de Bien'ici). En cas d'ambiguïté (deux communes homonymes), les renseigner à la main dans `bienici.zoneIds`.

## Exécution

```bash
node src/index.js --config config.json                       # toutes les plateformes actives
node src/index.js --config config.json --platform leboncoin  # une seule plateforme
node src/index.js --config config.json -p seloger -p bienici # plusieurs
```

Le script lance un seul navigateur Camoufox pour toute l'exécution, avec un seul contexte (cookies partagés), et ouvre un nouvel onglet par plateforme. Il affiche sa progression (page, nombre d'annonces, nouvelles annonces). Pour chaque zone, la pagination s'arrête dès qu'une page n'apporte **aucune annonce nouvelle**, quand le total annoncé par le site est atteint, ou à `maxPages`. Une pause aléatoire (`delays`) sépare chaque chargement de page. Une erreur sur une zone n'arrête pas la plateforme ; un blocage anti-robot arrête la plateforme concernée mais pas les autres.

Durée indicative : avec les délais par défaut (6,5 s en moyenne), 20 pages × 3 plateformes × 1 zone prennent environ 7 minutes.

## Format de sortie

Deux fichiers dans `output/` :

- `agences-AAAA-MM-JJ.csv` : séparateur `;`, encodage UTF-8 avec BOM (ouverture directe dans Excel en français) ;
- `agences-AAAA-MM-JJ.json` : mêmes données, plus des statistiques (`stats`) et la liste des erreurs (`erreurs`).

Colonnes :

| Colonne | Contenu |
|---------|---------|
| `plateforme` | `leboncoin`, `seloger` ou `bienici` |
| `agence` | Nom de l'agence tel qu'affiché |
| `id_agence` | Identifiant de l'agence sur la plateforme (boutique Leboncoin, compte Bien'ici...) |
| `url_agence` | Page de l'agence sur la plateforme, si connue |
| `nb_annonces_location` | Nombre d'annonces de location distinctes vues (> seuil) |
| `zones` | Zones dans lesquelles les annonces ont été trouvées (séparées par ` \| `) |
| `exemples_annonces` | Jusqu'à 3 URL d'annonces (séparées par ` \| `) |

Les lignes sont triées par nombre d'annonces décroissant. En cas de blocage ou de repli sur le HTML, le HTML de la page (avec son URL et son titre en commentaire) est enregistré dans `output/debug/` pour diagnostic.

## Fonctionnement

```
src/
  index.js              CLI : boucle plateformes x zones x pages, délais, reprise d'erreurs
  browser.js            lancement de Camoufox (camoufox-js + playwright-core), onglets, navigation, attente, evaluate, instantané HTML
  platforms/
    leboncoin.js        __NEXT_DATA__ de la page de recherche (category=10, owner_type=pro)
    seloger.js          état JSON sérialisé dans la page, repli sur les liens /annonces/locations/
    bienici.js          appel JSON realEstateAds.json (filterType "rent") depuis la page
    common.js           détection de blocage, correspondance des types de biens
  aggregate.js          dédoublonnage (plateforme, id annonce), comptage par agence, seuil strict
  output.js             écriture CSV et JSON
  config.js             chargement et validation de config.json
test/                   tests unitaires node:test avec petits fichiers JSON d'exemple
```

Le principe est de **lire les données JSON que les sites embarquent** dans leurs pages plutôt que de dépendre de sélecteurs CSS, beaucoup plus fragiles. Le script exécuté dans la page (via `page.evaluate` de Playwright) se contente de récupérer ces données brutes ; leur analyse est faite côté Node par des fonctions pures, testées unitairement. Un repli sur le HTML existe pour Leboncoin et SeLoger, mais il identifie rarement l'agence.

Regroupement des agences : par identifiant d'agence quand il est connu, sinon par nom normalisé (sans accents, casse ni ponctuation). Une annonce dont seul le nom d'agence est connu est rattachée à l'identifiant déjà vu pour ce même nom sur la même plateforme. Les annonces de particuliers et celles sans agence identifiable sont ignorées (comptées dans `stats`).

## Validation des parseurs sur pages réelles

**Important** : ce code a été écrit sans accès aux trois sites (bloqués depuis l'environnement de développement). Les chemins JSON, paramètres d'URL et noms de champs reposent sur la structure connue de ces sites et sont signalés comme "à valider" dans le code. Avant la première vraie exécution :

1. Lancer le script sur **une zone** et `"maxPages": 1`, une plateforme à la fois (`-p leboncoin`), de préférence avec `"browser": { "headless": false }` pour voir la page.
2. Vérifier dans la console que des annonces sont trouvées et que la source n'est pas le repli HTML ; ouvrir le JSON de sortie (passer temporairement `seuilAnnonces` à 0 pour tout voir) et contrôler quelques agences à la main sur le site.
3. En cas d'écart, inspecter la page : avec `headless: false`, ouvrir les outils de développement de la fenêtre Camoufox (console : `document.getElementById("__NEXT_DATA__")?.textContent.slice(0, 2000)`), ou lire le HTML enregistré dans `output/debug/`. Ajuster ensuite la fonction de parsing concernée et ajouter le cas dans `test/fixtures/`.

Points précis à confirmer :

- **Leboncoin** : chemin `props.pageProps.searchData.ads`, champs `owner.type`, `owner.store_id`, `owner.name` ; formats de `locations`, `real_estate_type`, `price`, `square`.
- **SeLoger** : format actuel des URL de recherche (`classified-search` et paramètre `page`) et noms des champs du bloc agence (`contact.agencyId`, `agencyName`, `agencyLink` ou équivalents).
- **Bien'ici** : champs identifiant l'agence dans `realEstateAds` (`accountDisplayName`, `userRelativeData.accountIds`, préfixe `agXXXX` de l'identifiant d'annonce...) et forme de l'URL publique des annonces.

## Limites

- **PAP exclu** : site entre particuliers, sans annonces d'agences (voir [Objectif](#objectif)).
- **Parseurs non validés en conditions réelles** : voir la section précédente. Les sites changent régulièrement leur structure ; prévoir une revalidation quand les résultats deviennent vides ou incohérents.
- **Pagination plafonnée par les sites** : Leboncoin, SeLoger et Bien'ici limitent le nombre de pages consultables pour une même recherche (de l'ordre de quelques milliers d'annonces au plus). Sur une grande ville, découper en zones plus petites (arrondissements, codes postaux) pour ne rien manquer ; une annonce vue dans deux zones n'est comptée qu'une fois.
- **Agences multi-agences et franchises** : un même réseau (Foncia, Century 21, Orpi...) ou une agence à plusieurs boutiques peut apparaître sous plusieurs identifiants, et chaque agence est alors comptée séparément. Inversement, deux agences homonymes sans identifiant peuvent être fusionnées. Vérifier à la main les cas ambigus.
- **Annonces sans agence identifiable** : ignorées (nombre indiqué dans `stats.ignoreesSansAgence`).
- **Mandataires** : les mandataires indépendants (IAD, SAFTI, Capifrance...) sont généralement des comptes "pro" et apparaissent comme des agences.
- **Blocages anti-robots** : DataDome (Leboncoin, SeLoger) peut bloquer après un certain volume malgré Camoufox ; le script s'arrête alors proprement pour la plateforme concernée.
- **Camoufox en développement** : voir [État du projet Camoufox](#état-du-projet-camoufox).
- **Non testé avec le vrai navigateur dans l'environnement de développement** : le téléchargement de Camoufox (publications GitHub) y était bloqué. `src/browser.js` est couvert par des tests avec un faux navigateur ; le premier lancement réel reste à faire.

## Risques juridiques

L'utilisateur a indiqué accepter le risque. Pour mémoire :

- **Jurisprudence** : dans l'affaire *Leboncoin c. Entreparticuliers.com* (cour d'appel de Paris, 2 février 2021), l'extraction et la réutilisation systématiques d'annonces de Leboncoin ont été jugées contraires au **droit sui generis du producteur de base de données** (articles L.341-1 et suivants du Code de la propriété intellectuelle), avec condamnation à des dommages et intérêts.
- **Droit sui generis** : interdit l'extraction ou la réutilisation d'une partie **substantielle** (en quantité ou en qualité) d'une base, ainsi que l'extraction répétée et systématique de parties non substantielles. Ici, seuls des comptages et des noms d'agences sont conservés et rien n'est republié, ce qui réduit l'exposition sans la supprimer.
- **Conditions générales** : les CGU de SeLoger (comme celles de Leboncoin et de Bien'ici) interdisent la collecte automatisée de leur contenu ; leur violation peut fonder une action contractuelle ou une coupure d'accès.
- **RGPD** : les noms d'agences sont des personnes morales, mais certains comptes "pro" sont des mandataires en nom propre (personnes physiques). Limiter la conservation au strict nécessaire et ne pas croiser ces données avec d'autres sources sans base légale.

Bonnes pratiques retenues dans l'outil : délais aléatoires de plusieurs secondes entre pages, un seul onglet à la fois, nombre de pages plafonné, aucun stockage du contenu des annonces (seulement identifiants, URL et agence).

## Dépannage

| Symptôme | Piste |
|----------|-------|
| `lancement de Camoufox impossible : Version information not found...` | Le navigateur n'est pas téléchargé : `npm run fetch-browser`. Si `CAMOUFOX_INSTALL_DIR` a servi au téléchargement, la définir aussi au lancement. |
| `Failed to fetch releases from https://api.github.com/...` | Le téléchargement passe par l'API GitHub : vérifier l'accès réseau à `api.github.com` et `github.com`, ou définir `GITHUB_TOKEN` (limite de requêtes). |
| `camoufox-js introuvable` | `npm install` dans `veille-agences/`. |
| Échec au lancement avec `"virtual"` | Installer `Xvfb` ou repasser à `headless: true`. |
| `accès bloqué (anti-bot / captcha)` | Attendre quelques heures, augmenter `delays`, réduire `maxPages`, puis en dernier recours configurer un proxy résidentiel. L'instantané de la page est dans `output/debug/`. |
| `JSON embarqué introuvable, repli DOM` | La structure du site a changé : voir [Validation des parseurs](#validation-des-parseurs-sur-pages-réelles). |
| 0 annonce sur SeLoger | Vérifier `seloger.searchUrl` : l'ouvrir dans un navigateur, elle doit afficher des résultats de **location**. |
| `bienici : zone ... introuvable` | Renseigner `bienici.zoneIds` à la main (identifiants visibles dans les requêtes réseau `realEstateAds.json` du site). |
| Onglet perdu (page plantée, navigateur fermé) | Géré automatiquement : un nouvel onglet est ouvert (et le navigateur relancé si besoin), puis l'opération est retentée une fois. |
| Erreur de géolocalisation au lancement avec proxy | La recherche de l'IP de sortie a échoué : vérifier le proxy, ou passer `browser.geoip` à `false` (l'identité `fr-FR` / `Europe/Paris` est alors utilisée). |
