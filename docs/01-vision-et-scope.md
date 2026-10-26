# 01 : Vision et périmètre

## Vision

Un jeu de gestion de zoo **chaleureux et lisible** : on doit comprendre d'un coup d'œil où sont les animaux,
s'ils vont bien, et si les visiteurs s'amusent. Pas de simulation lourde : des systèmes simples qui
s'emboîtent et créent des choix intéressants.

## Piliers

1. **Lisibilité** : on distingue immédiatement un zèbre d'une girafe, un enfant d'un adulte, un animal
   heureux d'un animal en détresse (icônes, animations).
2. **Boucle courte et satisfaisante** : construire → accueillir → voir les visiteurs réagir → réinvestir.
3. **Compromis animaux / argent** : un bel habitat coûte cher mais attire plus et rend les animaux heureux.
4. **Extensible** : tout est piloté par des données pour ajouter espèces, bâtiments et scénarios sans réécrire.

## Boucle de jeu

```
Construire (chemins, enclos, équipements)
   → Acheter et placer des animaux
      → Les visiteurs arrivent, observent, dépensent
         → Revenus → Réinvestir (nouvelles espèces, meilleurs habitats, services)
            → Note du zoo ↑ → plus de visiteurs
```

## Périmètre du POC

### Inclus

- Carte en grille (48×48), terrain plat, quelques biomes (savane, forêt, herbe, eau, sable).
- Construction : chemins, clôtures (enclos détectés automatiquement), nourrisseurs, point d'eau, décor
  (arbres, rochers), bancs, stand de snacks.
- 4 espèces : zèbre, girafe, lion, panda.
- Besoins des animaux (faim, soif, bien-être lié à l'habitat) et états visibles.
- Visiteurs (adultes et enfants) : arrivée, déplacement sur les chemins, observation, satisfaction, départ.
- Économie : billets, achats, entretien, argent, note du zoo (1 à 5 étoiles).
- Cycle jour/nuit simple, pause et vitesses de jeu.
- Objectifs de départ, condition de défaite (faillite), sauvegarde locale.
- Déploiement web.

### Exclu du POC (voir `06-roadmap-suite.md`)

- Personnel (gardiens, vétérinaires), salaires, planning.
- Relief / terraformation, rivières, ponts, tunnels.
- Reproduction, génétique, maladies complexes, évasions.
- Recherche et déblocages, campagne, succès.
- Audio complet, localisation multiple, mods, multijoueur.
- Mobile tactile optimisé (prévu dans l'architecture, pas dans le POC).

## Critères de succès du POC

Le POC est réussi si, après 20 minutes de jeu :

- [x] On a envie de « juste placer un animal de plus » ou d'agrandir un enclos.
  *Itération 4 : confirmé par le playtest de Pierre (2026-10-26).*
- [x] On voit sans effort **qui est affamé, qui est content, quel enclos attire du monde**.
  *Icônes d'état des animaux, bulles d'humeur des visiteurs, foule devant les enclos, alertes (revues des itérations 2 à 4).*
- [x] Un zoo mal conçu fait vraiment perdre de l'argent, un zoo bien pensé est rentable.
  *Test de rentabilité `tests/sim/balance.test.ts` : faillite au jour 17 (ou 26 au prix juste) contre +2 000 par jour (ADR-029).*
- [x] Le jeu tient 60 fps sur un laptop récent avec ~40 animaux et ~150 visiteurs.
  *Apple M3 Pro, Chromium Metal, 1920 × 1080, `busy-day` : 219 visiteurs, 40 animaux, frame moyenne 16,6 ms
  (p95 16,8 ms, calée sur la synchro écran) avec la simulation qui tourne (itération 4).*
- [x] Une partie sauvegardée se recharge à l'identique.
  *Test aller-retour : état identique, puis un jour de jeu identique après rechargement (`tests/sim/save.test.ts`).*
