# 07 : Déploiement multi-plateforme

Principe : **une seule base de code web**, emballée selon la cible.

```
          ┌─ Web / PWA        (POC)  hébergement statique
src/ ─────┼─ Desktop          (V0.7) Tauri ou Electron
          └─ Mobile natif     (V0.7) Capacitor
```

## Web (POC)

### Build

`npm run build` produit `dist/` : fichiers statiques, déployables partout.

Réglages Vite à prévoir :
- `base` : `'/'` en domaine propre ; `'/<nom-du-repo>/'` sur GitHub Pages.
- Séparation du code `three` dans un chunk dédié (`manualChunks`) pour un meilleur cache.
- Assets lourds (GLB, audio) dans `public/assets/`.

### Hébergement

Au choix, tous gratuits pour un projet de ce type :
- **Cloudflare Pages** : le plus confortable (CDN, previews par branche, bonne compression).
- **Netlify** : équivalent.
- **GitHub Pages** : le plus simple si le dépôt est déjà sur GitHub.

### Exemple de workflow GitHub Pages (`.github/workflows/deploy.yml`)

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Vérifier les versions d'actions au moment de la mise en place.

### PWA (fin d'itération 4 ou V0.7)

- `vite-plugin-pwa` : manifeste, icônes, service worker, mode hors ligne.
- Mise en cache des assets ; stratégie « réseau d'abord » pour les pages, « cache d'abord » pour les modèles.
- Mettre à jour la version de sauvegarde et prévoir la migration avant toute mise en ligne publique.

## Desktop (V0.7)

| | Tauri | Electron |
|---|---|---|
| Taille de l'application | très légère | ~100+ Mo |
| Moteur web | celui du système (variable selon l'OS) | Chromium embarqué (identique partout) |
| Mise en place | demande Rust installé | uniquement Node |
| Intégration Steam | possible | plus courante et documentée |

Recommandation de départ : **Tauri** pour la légèreté ; basculer sur Electron si les écarts de rendu WebGL
entre moteurs système posent problème.

Points d'attention : sauvegardes dans le dossier de données utilisateur, plein écran, signature des exécutables,
mises à jour.

## Mobile (V0.7)

- **Capacitor** emballe le build web dans une application iOS / Android.
- Prérequis jeu : interface tactile (zones ≥ 44 px, gestes deux doigts pour pan/zoom/rotation, pas de survol),
  mode paysage, gestion de la veille et de la reprise, budget perf plus serré (30 fps visés).
- Prévoir des réglages de qualité (ombres, densité de foule, résolution du rendu).
- Comptes développeurs payants (Apple, Google) nécessaires pour publier sur les stores.

## Budgets de performance (garde-fous)

| Mesure | Cible |
|---|---|
| Poids JS initial (compressé) | < 1 Mo hors Three.js |
| Poids total des assets du POC | < 15 Mo |
| Temps de chargement (4G correcte) | < 5 s jusqu'au premier écran jouable |
| FPS desktop | 60 avec 40 animaux et 150 visiteurs |
| FPS mobile milieu de gamme | 30 minimum avec réglages réduits |
| Mémoire | < 500 Mo sur mobile |

## Checklist avant mise en ligne publique

- [ ] Nom de travail remplacé par un nom libre de droits (vérifier marques existantes).
- [ ] `public/assets/CREDITS.md` complet, licences vérifiées.
- [ ] Sauvegarde versionnée et testée sur migration.
- [ ] Pas de collecte de données sans information du joueur.
- [ ] Test sur Chrome, Firefox, Safari (desktop et iOS), un Android milieu de gamme.
