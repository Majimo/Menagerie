---

description: Réalise le prochain jalon (itération) non terminé de la roadmap, de la planification au commit
argument-hint: "[numéro d'itération optionnel, ex. 2]"
---

Tu enchaînes le prochain jalon du projet. Argument éventuel : $ARGUMENTS

## 1. Identifier le jalon

- Lis `CLAUDE.md`, puis la section « Statut » de `README.md` et `docs/05-roadmap-poc.md`.
- Si `$ARGUMENTS` contient un numéro d'itération, prends celui-ci. Sinon, prends **la première itération dont les critères d'acceptation ne sont pas tous cochés**.
- Si tout le POC est terminé, lis `docs/06-roadmap-suite.md`, propose le palier suivant avec un découpage en itérations
  (même format que `05-roadmap-poc.md`), ajoute-le à `docs/05-roadmap-poc.md` ou dans un nouveau fichier de roadmap, et **arrête-toi** pour validation.
- Vérifie que l'itération précédente est bien terminée (`npm run check` passe). Sinon, signale-le et arrête-toi.

## 2. Se documenter

Relis uniquement ce qui sert ce jalon :
- toujours : `docs/02-regles-du-jeu-poc.md` et `docs/03-architecture.md`
- si rendu, assets ou UI : `docs/04-direction-artistique.md`
- si déploiement : `docs/07-deploiement.md`
- dès qu'il y a du rendu ou de l'UI : `docs/09-verification-visuelle-et-accessibilite.md`

## 3. Planifier

Annonce en 8 points maximum : ce que tu vas faire, dans quel ordre, quels fichiers, quels tests.
Ne demande validation que s'il y a un vrai choix bloquant ou une ambiguïté qui change le résultat ; sinon continue.

## 4. Implémenter

- **Simulation et tests d'abord**, puis rendu, puis UI.
- Respecte les règles d'architecture de `CLAUDE.md` (sim pure, commandes, PRNG seedé, données, tick fixe).
- Ne fais rien qui appartienne à une itération ultérieure.
- Petits commits au fil de l'eau (`feat(sim): …`, `feat(render): …`, `test: …`).

## 5. Vérifier

- Lance `npm run check` et corrige jusqu'à ce que tout passe.
- Passe les **critères d'acceptation** un par un. Pour chacun, indique : ✅ vérifié (comment) ou ❌ non atteint (pourquoi).
- Lance `npm run test:e2e` (scénarios et accessibilité axe) et corrige.
- **Revue visuelle** : si le jalon touche au rendu ou à l'UI, lance `npm run shots`, **ouvre chaque capture** et compare-la à la grille de
  `docs/09-verification-visuelle-et-accessibilite.md` (cohérence, lisibilité, lisibilité ludique, interface, accessibilité sous simulation de daltonisme).
  Corrige et recommence, 3 boucles maximum. Écris `artifacts/review/<N>.md` avec un verdict par capture.
- Pour ce qui reste impossible à juger automatiquement (ressenti, fun), décris ce qu'il faut vérifier à la main et signale tes doutes sans trancher.

## 6. Clôturer

Si **tous** les critères sont atteints :
- coche-les dans `docs/05-roadmap-poc.md` et coche l'itération dans la section « Statut » de `README.md` ;
- ajoute une entrée dans `docs/08-decisions.md` pour chaque décision structurante prise ;
- note les dettes techniques dans `docs/06-roadmap-suite.md` si besoin ;
- fais un dernier commit `docs: clôture itération N`.

Si certains critères ne sont pas atteints : ne coche rien, liste ce qui reste.

## 7. Compte rendu final (court)

1. Ce qui a été fait, en 5 lignes maximum.
2. Critères : ✅ / ❌, plus le verdict de la revue visuelle et de l'accessibilité (✅ / ⚠️ / ❌ restants).
3. **Comment l'essayer** (commandes et 3 à 5 actions à tester dans le jeu).
4. Dettes ou points d'attention.
5. Prochain jalon : son titre et son objectif en une phrase. **Ne le commence pas.**
