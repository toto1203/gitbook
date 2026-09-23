# Partie 4 · La preuve

## 4.1 Hiérarchie de preuve : hypothèse, POC, pilote, industrialisation

> Règle : aucun chiffre sans baseline.

« L'IA nous fait gagner 30 % de temps. »

Vous avez entendu cette phrase dans un salon professionnel, dans une démonstration de logiciel, dans une réunion de réseau. Vous l'avez peut-être prononcée. Elle ne veut rien dire tant qu'on n'a pas répondu à quatre questions : trente pour cent par rapport à quoi ? Mesuré comment ? Sur quelle durée ? Par qui ?

Le marché des outils immobiliers est saturé de chiffres sans origine : études d'éditeurs qui mesurent leurs propres outils sur leurs propres clients, témoignages recueillis la deuxième semaine d'utilisation, pourcentages transposés d'une agence parisienne de location à une agence rurale de transaction. Ce n'est pas que les gens mentent. C'est que personne, dans la chaîne, n'a été chargé de mesurer.

Le dirigeant est le seul à pouvoir exiger autre chose. Pas parce qu'il comprend mieux la technologie, mais parce qu'il signe le budget et portera la déception.

### 4.1.1 Quatre étages, quatre questions différentes

* **Hypothèse.** *Qu'est-ce qu'on croit, et pourquoi ?* On produit une phrase testable et une mesure de départ. On monte à l'étage suivant quand la mesure de départ existe.
* **POC** (démonstration de faisabilité). *Est-ce que ça marche techniquement, sur nos données ?* On produit une démonstration sur nos vrais dossiers. On monte quand le résultat se reproduit sur un échantillon.
* **Pilote.** *Est-ce que ça marche chez nous, avec nos équipes ?* On produit un usage réel sur un périmètre limité. On monte quand l'écart avec la mesure de départ est établi et tient dans le temps.
* **Industrialisation.** *Comment ça tient à l'échelle ?* On produit un process, une formation, une supervision et un coût complet. On valide quand le gain net survit au coût de fonctionnement.

### L'hypothèse, l'étage qu'on saute toujours

Une bonne hypothèse tient en une phrase : « Si nous [faisons ceci], alors [cet indicateur] passera de [sa valeur actuelle] à [cette cible], pour [ces personnes], en [cette durée]. »

*Exemple en agence :* « Si nos négociateurs utilisent un assistant pour préparer les relances des estimations non signées, le nombre de relances envoyées par semaine passera de 10 à 25 par négociateur, sans que le taux de reprise de contact descende sous 8 %, en deux mois. »

Cette phrase oblige à connaître la valeur actuelle. Combien de relances par semaine aujourd'hui ? Quel taux de reprise de contact ? Si vous ne le savez pas, et c'est le cas dans la majorité des agences, vous venez de découvrir que vous n'aurez aucun moyen de savoir plus tard si l'IA a changé quelque chose.

C'est là que se prend la **baseline**, avant de toucher à quoi que ce soit. Après, l'outil est installé, les habitudes ont bougé, et le « avant » n'existe plus.

### Le POC : vérifier que c'est possible, rien de plus

Le POC vérifie que la technologie fait ce qu'on attend d'elle **sur vos données**, pas sur celles de la démonstration : vos fiches de découverte incomplètes, vos PV d'assemblée générale scannés, vos e-mails de candidats rédigés sur téléphone.

Durée normale : deux à quatre semaines. Livrable : un constat du type « sur 100 dossiers, l'outil en traite correctement 87 ; les 13 autres ont ceci en commun ».

Le danger du POC est sa réussite. Une démonstration qui fonctionne produit un enthousiasme qui fait oublier qu'on n'a rien mesuré en conditions réelles.

### Le pilote : le vrai test

Trois règles le définissent.

* **Un périmètre réduit** : un négociateur, une agence du réseau, un type de bien, un type de dossier.
* **Une durée suffisante** : six à huit semaines. Les deux premières semaines mentent toujours, dans un sens ou dans l'autre.
* **Une comparaison avec la baseline** sur le même indicateur, idéalement en gardant une partie de l'équipe dans l'ancien fonctionnement sur la même période.

*Subtilité de taille :* une agence de trois personnes ne peut pas constituer de groupe témoin. Elle compare la même personne avant et après, sur une période comparable, en tenant compte de la saisonnalité (un mois de septembre en location ne se compare pas à un mois de février). Un réseau ou un groupe, lui, peut comparer une agence pilote à des agences similaires, ce qui donne une preuve bien plus solide.

### L'industrialisation : la question change de nature

On ne se demande plus si ça marche, mais ce que ça coûte de le faire marcher tous les jours, pour tout le monde, pendant des années : licences, formation des nouveaux arrivants (le turnover des négociateurs est élevé dans le métier), supervision permanente, maintenance, conformité.

Le gain brut du pilote devient un gain net, presque toujours plus modeste. Ce n'est pas un échec. C'est le chiffre honnête.

### L'échelle n'est pas un escalier obligatoire

Un usage abandonné au stade du POC a coûté trois semaines ; le même usage abandonné après industrialisation a coûté un an et la confiance des équipes. **L'échec précoce est un succès de méthode.**

### 4.1.2 La règle : aucun chiffre sans baseline

**Un indicateur, pas une impression.** Choisissez quelque chose qui se compte : délai de mise en ligne d'un mandat, nombre de relances envoyées, délai de première réponse à un candidat, dossiers renvoyés par le notaire, nombre d'appels entrants par bien loué. Un seul indicateur principal par hypothèse. « Les négociateurs sont plus à l'aise » n'est pas un indicateur.

**Une mesure avant, sur la même chose.** Si vous voulez savoir si l'IA accélère la rédaction des annonces, chronométrez dix annonces sans IA avant d'en chronométrer dix avec : mêmes types de biens, mêmes personnes, même manière de compter. C'est l'étape qui manque dans neuf projets sur dix, parce qu'elle retarde de deux ou trois semaines le moment où l'on touche à l'outil. Ces semaines sont le meilleur investissement du projet.

**Une comparaison honnête.** Trois biais reviennent sans cesse :

* **L'effet nouveauté** : on s'applique parce qu'on est observé.
* **Le tri des cas faciles** : on donne à l'IA les dossiers simples et on garde les autres.
* **L'oubli de la relecture** : on compte le temps gagné à produire, pas le temps passé à vérifier.

### Les cinq chiffres à refuser

1. **Le pourcentage sans dénominateur** : « 40 % plus rapide ». Que quoi ?
2. **Le chiffre de l'éditeur transposé tel quel** : mesuré ailleurs, sur d'autres données, par des gens qui vendent l'outil.
3. **Le gain mesuré sur la première semaine.**
4. **Le temps gagné sans le temps de relecture.**
5. **Le retour sur investissement calculé sans le coût de la supervision humaine.**

### 4.1.3 Ce que cela change dans la décision

Quatre questions, une par étage, à chaque usage IA présenté :

1. **Qu'est-ce qu'on croit ?** L'hypothèse, en une phrase.
2. **Où en est la preuve ?** À quel étage, et qu'a-t-on mesuré ?
3. **Par rapport à quoi ?** La baseline.
4. **Combien ça coûte de le faire tenir ?** Le coût complet.

Ces questions protègent contre deux erreurs symétriques : industrialiser trop tôt sur la foi d'une démonstration, et rester éternellement en pilote. Concrètement : une liste de vos usages IA avec, pour chacun, l'étage, l'indicateur et la baseline. Si vous avez fait l'inventaire recommandé en partie 7, il suffit d'y ajouter ces informations.

La hiérarchie de preuve n'est pas un frein. C'est ce qui permet de financer l'IAtisation. Un dirigeant qui présente à ses associés, à sa tête de réseau ou à sa banque un pilote mesuré obtient un budget. Celui qui présente une démonstration obtient des questions.

---

## 4.2 Trois cas d'usage en agence

> **Cas démonstratifs.** Les trois cas suivants sont construits à partir de situations typiques rencontrées en agence, avec des ordres de grandeur réalistes, mais ils ne décrivent pas une entreprise précise. Nous préférons un cas démonstratif annoncé comme tel à un témoignage dont personne ne peut vérifier la baseline.

Chaque cas suit les quatre étages, avec ce qu'on ne vous dira pas ailleurs : la déception, la limite, l'effet secondaire. Ils couvrent trois fonctions présentes dans presque toutes les agences : la prospection, la location, le back-office transaction.

### Cas 1 : Prospection, les estimations qui ne rappelaient jamais

**La situation de départ.** Une agence de transaction de 9 personnes, 4 négociateurs salariés et commissionnés. Un fichier de 900 estimations réalisées sur deux ans et non transformées en mandat. Le dirigeant le sait : les deux tiers n'ont jamais été recontactés. Ce n'est pas un manque de volonté, c'est un manque de temps : une relance pertinente demande de relire l'estimation, de regarder ce qui s'est vendu depuis dans la rue, d'écrire. Vingt minutes par contact.

**L'hypothèse et la baseline.** « Si l'IA prépare les messages de relance à partir de l'historique de chaque estimation et des ventes récentes du secteur, le nombre de relances envoyées par semaine et par négociateur passera de 10 à 25, sans que le taux de reprise de contact descende sous son niveau actuel, en deux mois. »

Baseline mesurée sur quatre semaines : 10 relances par semaine et par négociateur, 9 % de reprise de contact, 20 minutes par relance.

**POC, trois semaines.** On extrait 50 estimations avec leur historique. L'outil génère 50 messages. Les négociateurs les notent : utilisable tel quel, après correction, inutilisable. Résultat : 29, 15 et 6. Les six inutilisables concernent des estimations dont la fiche ne contenait presque rien. Constat : la qualité du message dépend directement de ce qui a été noté au rendez-vous. **L'IA ne rattrape pas un fichier mal renseigné.**

**Pilote, huit semaines.** Un négociateur sur quatre travaille avec l'outil ; les trois autres continuent comme avant. Résultat : 23 relances par semaine pour le négociateur équipé (contre 10 en baseline et 11 pour ses collègues). Taux de reprise de contact : 8,5 %, contre 9 % en baseline, dans le bruit. Temps par relance : 7 minutes, relecture comprise. Deux mandats exclusifs signés sur la période sont issus de ces relances, contre aucun chez les collègues sur le même fichier.

**Coûts cachés découverts.** Les deux premières semaines, le négociateur a passé plus de temps à corriger le ton qu'il n'en gagnait. Deux vendeurs ont fait remarquer que le message « ressemblait à un modèle », ce qui a conduit à interdire tout envoi sans relecture.

**Décision.** Industrialisation partielle : l'outil prépare, le négociateur relit, ajuste et envoie. Pas d'envoi automatique. Et un chantier préalable : une fiche de découverte obligatoire, remplie avant de quitter le rendez-vous.

**Ce qu'on ne vous dira pas ailleurs.** Le gain réel (13 minutes par relance) est très inférieur à la démonstration où le message sortait en trente secondes. Le taux de réponse n'a pas augmenté : l'IA a changé le volume, pas la qualité. Le résultat le plus durable n'est pas l'outil, c'est la discipline de saisie qu'il a rendue nécessaire. Et l'indicateur qui compte vraiment pour l'agence n'est pas le nombre de relances : ce sont les mandats rentrés.

*Réglementaire :* usage à risque minimal au sens de l'AI Act. Respect des règles de prospection (consentement, opposition) et d'une politique claire sur les données confiées à l'outil.

### Cas 2 : Location, le service qui passait ses journées à relancer

**La situation de départ.** Une agence de 12 personnes avec un service location de 2 personnes. Environ 25 biens mis en location par mois, et en moyenne 30 demandes par bien, par téléphone, e-mail, portails et site. La grande majorité des candidats envoient un dossier incomplet ou éparpillé sur plusieurs e-mails. Les deux assistantes passent une part importante de leur journée à répondre aux mêmes questions et à réclamer des pièces. Le téléphone sonne sans arrêt.

**L'hypothèse et la baseline.** « Si nous centralisons les demandes et confions la collecte et la relance des pièces à un parcours en ligne automatisé, le délai entre la première demande et un dossier complet passera de 6 jours à moins de 2, et le nombre d'appels entrants par bien loué baissera d'au moins 40 %, sans hausse des réclamations de candidats, en deux mois. »

Baseline mesurée sur quatre semaines (hors période de rentrée universitaire, pour ne pas fausser la saisonnalité) : délai médian de 6 jours pour obtenir un dossier complet ; 38 % des dossiers encore incomplets le jour de la visite ; environ 35 appels entrants par jour pour le service ; 3 heures 10 de travail administratif par bien loué.

Les chiffres de l'éditeur (une heure gagnée par jour et par collaborateur, 80 % d'appels en moins) sont notés, mais **ne servent pas de cible** : ils ont été mesurés ailleurs.

**Mise en place.** C'est le point qui distingue ce cas des deux autres : il n'y a pas eu de POC technique long. La solution retenue (Greenloc dans ce cas démonstratif) se branche sur les annonces diffusées et sur le logiciel de l'agence, sans développement. Le travail a porté sur le paramétrage : liste des pièces demandées, vérifiée contre la liste autorisée par décret ; messages aux candidats réécrits dans le ton de l'agence ; règle d'organisation nouvelle : **pas de visite sans dossier complet**. Délai entre la décision et le premier bien traité : moins d'une semaine.

**Pilote, six semaines.** La moitié des biens passe par le nouveau parcours, l'autre moitié reste traitée comme avant, sur la même période et avec les mêmes deux assistantes.

Résultat : délai médian de 2,5 jours pour un dossier complet (contre 6 sur l'autre moitié) ; 9 % de dossiers incomplets le jour de la visite (contre 36 %) ; appels entrants sur les biens pilotes en baisse de 45 % ; travail administratif ramené à 1 heure 50 par bien loué. Quatre dossiers comportant des documents falsifiés ont été signalés par le contrôle antifraude ; après vérification humaine, trois l'étaient réellement, le quatrième était un document authentique mal scanné.

**Coûts cachés découverts.** Une partie des candidats (souvent âgés, ou peu à l'aise avec le numérique) n'a pas pu déposer en ligne : il a fallu maintenir un accompagnement téléphonique et un dépôt assisté à l'agence, sans quoi l'agence aurait écarté de fait une population, ce qui pose une question de non-discrimination. La synthèse et le score de dossier ont d'abord été utilisés par une assistante comme un filtre (« je ne regarde que les dossiers au-dessus de tel seuil ») ; la règle a été corrigée : **chaque dossier complet est regardé par un humain**, le score sert à prioriser la lecture, pas à écarter. Enfin, l'information des candidats sur le traitement de leurs données a dû être revue.

**Décision.** Go et généralisation à tous les biens en location, avec trois garde-fous permanents : un canal non numérique maintenu ; aucune décision de refus sans lecture humaine du dossier ; revue trimestrielle des critères utilisés pour la priorisation.

**Ce qu'on ne vous dira pas ailleurs.** Le gain mesuré sur les appels (45 %) est nettement inférieur à celui qu'annonce l'éditeur ; il reste très significatif. Une partie du gain ne vient pas de l'outil mais de la règle « pas de visite sans dossier complet », que l'agence n'avait jamais osé appliquer. Et c'est le seul des trois cas où la mise en place a été plus rapide que la mesure de départ : preuve qu'un processus bien choisi n'a pas besoin d'un grand projet.

*Réglementaire :* la collecte, la vérification de complétude et la détection de fraude documentaire relèvent du risque minimal au sens de l'AI Act (le texte exclut d'ailleurs expressément la détection de fraude de la catégorie « évaluation de solvabilité »), sous réserve du RGPD. La décision d'attribution est une décision qui produit des effets importants sur une personne : elle ne peut pas être entièrement automatisée (RGPD), elle est surveillée au titre de la non-discrimination, et la qualification d'un scoring de solvabilité au regard du « haut risque » de l'AI Act est une zone grise que nous recommandons de traiter avec prudence (voir partie 7).

### Cas 3 : Transaction, le dossier de vente qui revenait du notaire

**La situation de départ.** Un réseau de 4 agences, 30 personnes. Environ 35 compromis par mois. L'assistante de chaque agence constitue le dossier transmis au notaire : titre de propriété, diagnostics, et pour les lots en copropriété, règlement, trois derniers procès-verbaux d'assemblée générale, fiche synthétique, pré-état daté. Une part des dossiers revient pour pièce manquante ou information incohérente, ce qui retarde la signature.

**L'hypothèse et la baseline.** « Si l'IA analyse les documents reçus, établit la liste des pièces manquantes et signale les points d'attention, le temps de constitution d'un dossier passera de 2 heures à moins de 45 minutes, et le taux de dossiers renvoyés par le notaire baissera, en trois mois. »

Baseline mesurée sur quatre semaines : 1 heure 50 en moyenne par dossier (de 40 minutes pour une maison simple à plus de 4 heures pour un lot dans une grande copropriété) ; 18 % de dossiers renvoyés pour complément. Le « ça nous prend une demi-journée par dossier » ressenti était donc exagéré : **la mesure corrige l'impression.**

**POC, trois semaines.** 60 dossiers historiques. L'outil identifie les pièces et extrait les informations clés ; on compare à ce qui avait été fait. Résultat : 92 % de détection correcte des pièces manquantes ; 85 % d'extraction correcte des informations sur les diagnostics récents ; 55 % seulement sur les procès-verbaux anciens scannés, souvent de mauvaise qualité, parfois manuscrits. Surtout : sur les « points d'attention » (travaux votés, procédures), l'outil en a signalé la plupart, mais en a manqué deux sur 60 qui auraient eu une incidence sur la vente.

**Pilote, huit semaines, sur une agence.** Périmètre restreint : maisons et copropriétés dont les documents sont numériques. L'outil prépare la check-list et la synthèse ; l'assistante vérifie chaque point ; le négociateur relit les points d'attention avant envoi.

Résultat : 50 minutes par dossier, vérification comprise, contre 1 heure 45 en baseline sur ce périmètre ; taux de renvoi par le notaire de 9 %.

**Coûts cachés découverts.** La vérification représente plus de la moitié des 50 minutes et ne diminuera pas : on ne transmet pas un dossier de vente sans le relire. Une part du gain vient d'une décision prise en cours de pilote : demander systématiquement au syndic les documents en format numérique dès la prise de mandat, et non au moment du compromis.

**Décision.** Industrialisation sur le périmètre des documents numériques, dans les 4 agences. Abandon sur les procès-verbaux anciens scannés : le taux d'extraction ne justifie pas le temps de correction. Et le sujet est reformulé : le vrai problème n'était pas la lecture des documents, c'était le moment où on les demande.

**Ce qu'on ne vous dira pas ailleurs.** L'IA a manqué des points d'attention que seul un professionnel attentif aurait vus. Si l'agence avait supprimé la relecture du négociateur, elle aurait transféré un risque de responsabilité professionnelle en échange d'une heure de gain. Et l'abandon d'une partie du périmètre est exactement ce que la hiérarchie de preuve doit produire : un abandon qui coûte huit semaines au lieu d'un déploiement qui déçoit pendant deux ans.

*Réglementaire :* risque minimal au sens de l'AI Act. Point d'attention sur la confidentialité des documents des vendeurs et des copropriétés confiés à l'outil, et sur la responsabilité professionnelle, qui reste entière.

---

### Ce que les trois cas ont en commun

**Cas 1, prospection.** Indicateur : relances par semaine. Baseline : 10. Gain promis par la démonstration : un message en 30 secondes au lieu de 20 minutes. Gain net au pilote : volume multiplié par 2,3, temps divisé par 3. Coût permanent : relecture avant envoi. Abandonné : l'envoi automatique. De l'hypothèse à la décision : 11 semaines.

**Cas 2, location.** Indicateur : délai jusqu'au dossier complet. Baseline : 6 jours. Gain promis par l'éditeur : 80 % d'appels en moins. Gain net au pilote : délai divisé par 2,4, appels en baisse de 45 %. Coût permanent : lecture humaine de chaque dossier et canal non numérique. Abandonné : l'usage du score comme filtre. De l'hypothèse à la décision : 10 semaines.

**Cas 3, transaction.** Indicateur : temps de constitution d'un dossier. Baseline : 1 heure 50. Gain promis par la démonstration : analyse en quelques secondes. Gain net au pilote : temps divisé par 2 sur les documents numériques, nul sur les anciens scannés. Coût permanent : vérification point par point et relecture du négociateur. Abandonné : les procès-verbaux anciens scannés. De l'hypothèse à la décision : 11 semaines.

**Le gain réel est toujours inférieur à la démonstration**, d'un facteur deux à dix. La démonstration mesure la production sans la vérification ; en agence, la vérification ne disparaît jamais, parce que c'est elle qui engage votre responsabilité.

**Le gain vient souvent d'un changement de process autant que de l'IA.** La fiche de découverte obligatoire, la règle « pas de visite sans dossier complet », la demande anticipée des documents au syndic. L'IA a été le prétexte qui a rendu ces changements nécessaires. C'est peut-être son principal mérite.

**La relecture humaine n'est pas un coût de transition, c'est un coût permanent.** Un calcul de retour sur investissement qui l'oublie est faux.

Aucune de ces trajectoires ne divise un coût par dix. Aucune ne supprime un poste. Toutes dégagent, en deux à trois mois, un gain mesuré, documenté, défendable devant un associé ou une tête de réseau, et qui tient encore un an plus tard. L'IAtisation qui dure est faite de cela : des gains raisonnables, prouvés et cumulés.
