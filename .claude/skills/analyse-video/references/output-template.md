# Output template (French, markdown, no tables, no HTML)

Use this structure every time, in this order. Replace the guidance in angle brackets. Never use the characters "—" or "–"; use ";" or a comma. Address the user as "vous".

Tags: an untagged line is a fact taken from the evidence. `[inférence]` = interpretation. `[lacune]` = something the sampling or the engine could have missed, or could not verify.

```markdown
# Analyse vidéo : <titre ou description courte>

- **Source** : <lien ou nom de fichier> (<plateforme>)
- **Durée** : <MM:SS>
- **Moteur** : <"Gemini (gemini-3.7-flash), observations de Gemini relues et structurées" ou "Local (images + transcription), images vues directement">
- **Mode** : <pub | veille | formation>
- **Échantillonnage** : <Gemini : vidéo entière analysée par Gemini ; Local : N images (scène ou uniforme), images denses à 0,5 s sur 00:00 à 00:03, résolution 1024 px ; transcription : sous-titres / Whisper / indisponible>
- **Format** : <ratio et orientation, ex. 9:16 vertical>

## Chronologie

- **00:00** ; Écran : <ce qu'on voit> ; Texte : « <texte incrusté verbatim> » ; Parole : « <ce qui est dit> » ; Son : <musique / effet / silence> ; Changement : <début>
- **00:01.5** ; Écran : ... ; Texte : ... ; Parole : ... ; Son : ... ; Changement : <coupe franche, zoom, nouveau texte...>
- <un beat par coupe ou changement notable ; pour une formation longue, un beat par chapitre>

Rythme : <nombre de coupes, durée moyenne d'un plan, accélérations ; tag [inférence] si estimé>

## Structure

- **Ouverture** (<plage>) : <comment la vidéo commence et ce qui accroche>
- **Maintien de l'attention** (<plage>) : <procédés : coupes, textes, questions ouvertes, musique>
- **Bascule** (<horodatage>) : <le moment où le propos change : problème vers solution, révélation, offre>
- **Clôture** (<plage>) : <comment elle se termine, ce qui est demandé au spectateur>

## <Section propre au mode>

<pub> ## Analyse publicitaire
- **Accroche (0 à 3 s)** : <ce qui arrête le scroll, image par image>
- **Mécanismes de rétention** : <avec horodatages>
- **Offre** : <promesse, prix, conditions>
- **Appel à l'action** : « <formulation exacte> » à <MM:SS>, <oral / écrit / les deux>
- **Format et ratio** : <ratio, durée, adapté Feed / Reels / Stories>
- **Sous-titres** : <présents ou non, lisibles sur mobile, compréhension sans le son>
- **Présence de la marque** : <première apparition à MM:SS, fréquence>

<veille> ## Veille de format
- **Accroche** : <...>
- **Rythme** : <...>
- **Format / tendance** : <nom du format et éléments qui le définissent>
- **Reproductibilité pour Greenloc** : <ce qu'il faut (personnes, lieu, montage), comment l'adapter à l'immobilier ; tag [inférence]>

<formation> ## Contenu de la formation
1. **<MM:SS> ; <titre du chapitre>** : <objectif et points clés>
2. ...
- **Ressources citées** : <outils, liens, documents avec horodatage>

## 3 observations clés

1. **<observation la plus utile pour l'objectif du mode>** (<MM:SS>, <MM:SS>) : <pourquoi c'est important>
2. **<...>** (<MM:SS>) : <...>
3. **<...>** (<MM:SS>) : <...>

## Limites

- [lacune] <ce que l'échantillonnage ou le moteur a pu manquer, avec la plage concernée>
- [inférence] <rappel des principales conclusions qui sont des interprétations>
- <en mode local, toujours : [lacune] Musique, effets sonores et silences non analysés (le mode local ne traite pas l'audio hors parole).>
```

Only include the one mode-specific section that applies (pub, veille or formation), with its own heading. Keep the report tight: a 20 s ad usually needs 6 to 15 beats; do not pad.
