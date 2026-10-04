# Veille agences : agences immobilières à plus de 10 annonces de location

Outil interne Greenloc. Il repère les **agences immobilières** qui ont **strictement plus de 10 annonces de location** en ligne **sur une même plateforme** (Leboncoin, SeLoger, Bien'ici), pour une liste de zones géographiques.

Le navigateur utilisé est [camofox-browser](https://github.com/jo-inc/camofox-browser) (licence MIT) : un serveur REST (port 9377) qui pilote Camoufox, un Firefox modifié pour résister à la détection des robots.

## Sommaire

1. [Objectif](#objectif)
2. [Prérequis](#prérequis)
3. [Installation](#installation)
4. [Lancer camofox](#lancer-camofox)
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

- **Node.js 22 ou plus** (aucune dépendance npm : uniquement `fetch`, `node:test`, etc.).
- **Docker** (avec Docker Compose) pour faire tourner camofox.
- Environ 1 Go de disque pour l'image camofox (Camoufox pèse environ 300 Mo) et 1 à 2 Go de RAM libre.

### Où l'héberger ? Recommandation : Docker sur un poste local

- **Le plus simple** : un `docker compose up -d` et c'est prêt.
- **Gratuit** : aucun serveur à louer.
- **Adresse IP résidentielle** : Leboncoin et SeLoger sont protégés par DataDome, qui bloque très vite les IP de centres de données (AWS, OVH, Scaleway, etc.). Depuis une connexion de bureau ou domestique, le blocage est beaucoup plus rare.

Si le blocage persiste malgré tout, il faudra un **proxy résidentiel** (payant : Decodo, Bright Data, Oxylabs...). camofox le prend en charge par variables d'environnement (`PROXY_HOST`, `PROXY_PORT`, `PROXY_USERNAME`, `PROXY_PASSWORD`, `PROXY_PROTOCOL`, ou `PROXY_STRATEGY=backconnect` avec `PROXY_BACKCONNECT_HOST` / `PROXY_BACKCONNECT_PORT`, et `PROXY_COUNTRY`). Elles sont prêtes, commentées, dans `docker-compose.yml`. Dans ce cas, retirer `CAMOFOX_LOCALE` / `CAMOFOX_TIMEZONE` : Camoufox déduit alors la langue et le fuseau de l'IP du proxy.

## Installation

```bash
cd veille-agences
cp config.example.json config.json   # puis adapter config.json
node --test                          # tests unitaires (facultatif)
```

Aucun `npm install` n'est nécessaire.

## Lancer camofox

```bash
docker compose up -d
curl http://localhost:9377/health     # doit répondre {"ok":true,"engine":"camoufox",...}
```

Le fichier `docker-compose.yml` :

- utilise l'image publiée par le projet camofox, `ghcr.io/jo-inc/camofox-browser:latest` (amd64 et arm64, donc Mac M1/M2 compris) ;
- si cette image n'est pas disponible, commenter `image:` et décommenter le bloc `build:` : Docker construit alors l'image directement depuis le dépôt Git avec `Dockerfile.ci` (téléchargement de Camoufox pendant la construction, quelques minutes). Autre solution, documentée par camofox : `git clone https://github.com/jo-inc/camofox-browser && cd camofox-browser && make up` ;
- **désactive la télémétrie** de plantage de camofox (`CAMOFOX_CRASH_REPORT_ENABLED=false`) : par défaut, camofox envoie des rapports anonymisés à son éditeur ;
- n'expose le port qu'en local (`127.0.0.1:9377`) : l'API permet d'exécuter du JavaScript arbitraire, elle ne doit pas être ouverte sur le réseau ;
- fixe une identité navigateur française (`CAMOFOX_LOCALE=fr-FR`, `CAMOFOX_TIMEZONE=Europe/Paris`).

Sans Docker (Node 22) : `npx @askjo/camofox-browser` ou, depuis le dépôt, `npm install && npm start` ; exporter alors `CAMOFOX_CRASH_REPORT_ENABLED=false` avant le lancement.

Arrêt : `docker compose down`.

## Configuration

Fichier `config.json` (modèle : `config.example.json`) :

| Clé | Description | Défaut |
|-----|-------------|--------|
| `camofoxUrl` | URL du serveur camofox | `http://localhost:9377` |
| `userId` | Identifiant de session camofox (contexte navigateur isolé : cookies, stockage) | `greenloc-veille` |
| `platforms` | Plateformes actives : `{ "leboncoin": true, "seloger": true, "bienici": true }` | toutes |
| `zones` | Liste des zones (voir ci-dessous) | obligatoire |
| `filters.typeBien` | Types de biens : `appartement`, `maison`, `parking`, `terrain`... (vide = tous) | `[]` |
| `filters.prixMax` | Loyer maximum en euros (facultatif) | `null` |
| `filters.surfaceMin` | Surface minimale en m² (facultatif) | `null` |
| `seuilAnnonces` | Seuil **strict** : agence retenue si nombre d'annonces > seuil | `10` |
| `maxPages` | Nombre maximum de pages de résultats par zone et par plateforme | `20` |
| `delays.minMs` / `delays.maxMs` | Pause aléatoire entre deux chargements de page (minimum imposé : 1000 ms) | `4000` / `9000` |
| `outputDir` | Dossier de sortie | `output` |

Si le serveur camofox a été protégé par `CAMOFOX_ACCESS_KEY`, définir la même variable d'environnement avant de lancer le script (ou `accessKey` dans `config.json`).

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

Le script affiche sa progression (page, nombre d'annonces, nouvelles annonces). Pour chaque zone, la pagination s'arrête dès qu'une page n'apporte **aucune annonce nouvelle**, quand le total annoncé par le site est atteint, ou à `maxPages`. Une pause aléatoire (`delays`) sépare chaque chargement de page. Une erreur sur une zone n'arrête pas la plateforme ; un blocage anti-robot arrête la plateforme concernée mais pas les autres.

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

Les lignes sont triées par nombre d'annonces décroissant. En cas de blocage ou de repli sur le HTML, un instantané texte de la page est enregistré dans `output/debug/` pour diagnostic.

## Fonctionnement

```
src/
  index.js              CLI : boucle plateformes x zones x pages, délais, reprise d'erreurs
  camofox.js            client REST camofox (onglets, navigation, attente, evaluate, snapshot)
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

Le principe est de **lire les données JSON que les sites embarquent** dans leurs pages plutôt que de dépendre de sélecteurs CSS, beaucoup plus fragiles. Le script exécuté dans la page (via `POST /tabs/:id/evaluate` de camofox) se contente de récupérer ces données brutes ; leur analyse est faite côté Node par des fonctions pures, testées unitairement. Un repli sur le HTML existe pour Leboncoin et SeLoger, mais il identifie rarement l'agence.

Regroupement des agences : par identifiant d'agence quand il est connu, sinon par nom normalisé (sans accents, casse ni ponctuation). Une annonce dont seul le nom d'agence est connu est rattachée à l'identifiant déjà vu pour ce même nom sur la même plateforme. Les annonces de particuliers et celles sans agence identifiable sont ignorées (comptées dans `stats`).

## Validation des parseurs sur pages réelles

**Important** : ce code a été écrit sans accès aux trois sites (bloqués depuis l'environnement de développement). Les chemins JSON, paramètres d'URL et noms de champs reposent sur la structure connue de ces sites et sont signalés comme "à valider" dans le code. Avant la première vraie exécution :

1. Lancer camofox, puis le script sur **une zone** et `"maxPages": 1`, une plateforme à la fois (`-p leboncoin`).
2. Vérifier dans la console que des annonces sont trouvées et que la source n'est pas le repli HTML ; ouvrir le JSON de sortie (passer temporairement `seuilAnnonces` à 0 pour tout voir) et contrôler quelques agences à la main sur le site.
3. En cas d'écart, inspecter la page dans camofox : `curl -X POST localhost:9377/tabs/<tabId>/evaluate -H 'Content-Type: application/json' -d '{"userId":"greenloc-veille","expression":"document.getElementById(\"__NEXT_DATA__\")?.textContent.slice(0,2000)"}'`, puis ajuster la fonction de parsing concernée et ajouter le cas dans `test/fixtures/`.

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
- **Blocages anti-robots** : DataDome (Leboncoin, SeLoger) peut bloquer après un certain volume malgré camofox ; le script s'arrête alors proprement pour la plateforme concernée.

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
| `camofox injoignable sur http://localhost:9377` | `docker compose up -d`, puis `docker compose logs -f camofox` ; vérifier `curl localhost:9377/health`. |
| `accès bloqué (anti-bot / captcha)` | Attendre quelques heures, augmenter `delays`, réduire `maxPages`, puis en dernier recours configurer un proxy résidentiel. L'instantané de la page est dans `output/debug/`. |
| `JSON embarqué introuvable, repli DOM` | La structure du site a changé : voir [Validation des parseurs](#validation-des-parseurs-sur-pages-réelles). |
| 0 annonce sur SeLoger | Vérifier `seloger.searchUrl` : l'ouvrir dans un navigateur, elle doit afficher des résultats de **location**. |
| `bienici : zone ... introuvable` | Renseigner `bienici.zoneIds` à la main (identifiants visibles dans les requêtes réseau `realEstateAds.json` du site). |
| HTTP 401 / 403 de camofox | Le serveur exige `CAMOFOX_ACCESS_KEY` : exporter la même valeur avant de lancer le script. |
| Onglet perdu (404 / 410) | Géré automatiquement (réouverture d'un onglet). Si fréquent, augmenter `TAB_INACTIVITY_MS` et `SESSION_TIMEOUT_MS` dans `docker-compose.yml`. |
| Image Docker introuvable | Utiliser le bloc `build:` de `docker-compose.yml` ou `make up` dans un clone de camofox-browser. |
