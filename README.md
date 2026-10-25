# Ménagerie (nom de travail)

Jeu de gestion de zoo en **low poly, vue isométrique**, jouable dans le navigateur.
Inspiration : Planet Zoo / Zoo Tycoon, version volontairement simplifiée pour obtenir
un POC jouable et fun, puis une base saine pour un jeu plus conséquent.

> Nom de travail : à changer avant toute diffusion publique (éviter « Planet Zoo », « Zoo Tycoon »).

## Pitch

Tu construis un zoo : chemins, enclos, animaux. Les animaux ont des besoins et un habitat
qui leur convient (ou pas). Les visiteurs arrivent, se promènent, s'arrêtent devant les enclos,
sont ravis ou déçus, et paient. Le but : un zoo rentable **et** des animaux heureux.

## Stack

| Besoin | Choix |
|---|---|
| Langage | TypeScript (strict) |
| Build / dev server | Vite |
| Rendu | Three.js (caméra orthographique isométrique) |
| Simulation | TypeScript pur, sans dépendance au rendu |
| UI | DOM / CSS en surimpression (pas de framework au départ) |
| Tests | Vitest (simulation), Playwright + axe-core (captures, accessibilité) |
| Lint / format | Biome |
| Déploiement | Web statique (PWA), puis Tauri / Capacitor si besoin |

Version en ligne (déployée à chaque push sur `main`) : https://majimo.github.io/Menagerie/

## Démarrage rapide

```bash
npm install
npm run dev        # serveur de dev
npm run test       # tests unitaires (simulation)
npm run check      # lint + types + tests
npm run build      # build de production dans dist/
npm run test:e2e   # scénarios Playwright + accessibilité
npm run shots      # captures d'écran pour la revue visuelle
```

## Documentation

Lire dans cet ordre :

1. [`docs/01-vision-et-scope.md`](docs/01-vision-et-scope.md) : vision, boucle de jeu, périmètre du POC
2. [`docs/02-regles-du-jeu-poc.md`](docs/02-regles-du-jeu-poc.md) : règles de simulation et chiffres de départ
3. [`docs/03-architecture.md`](docs/03-architecture.md) : structure du code, séparation simulation / rendu
4. [`docs/04-direction-artistique.md`](docs/04-direction-artistique.md) : style low poly, lisibilité animaux / visiteurs
5. [`docs/05-roadmap-poc.md`](docs/05-roadmap-poc.md) : itérations 0 à 4 avec critères d'acceptation
6. [`docs/06-roadmap-suite.md`](docs/06-roadmap-suite.md) : après le POC, vers un jeu complet
7. [`docs/07-deploiement.md`](docs/07-deploiement.md) : web, desktop, mobile
8. [`docs/08-decisions.md`](docs/08-decisions.md) : journal des décisions techniques
9. [`docs/09-verification-visuelle-et-accessibilite.md`](docs/09-verification-visuelle-et-accessibilite.md) : captures d'écran, revue visuelle et ludique, accessibilité

`CLAUDE.md` contient les consignes de travail pour Claude Code.

## Enchaîner les itérations

Dans Claude Code, la commande `/jalon-suivant` prend la prochaine itération non terminée, la réalise,
la vérifie et la clôture. On peut aussi cibler une itération : `/jalon-suivant 2`.

## Statut

- [x] Itération 0 : setup
- [x] Itération 1 : monde, caméra, construction
- [x] Itération 2 : animaux
- [x] Itération 3 : visiteurs et économie
- [ ] Itération 4 : boucle de jeu, équilibrage, sauvegarde

## Licences des assets

Tenir à jour `public/assets/CREDITS.md` (source, auteur, licence de chaque asset).
