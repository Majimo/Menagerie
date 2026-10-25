# 04 : Direction artistique

## Objectif

Un monde **low poly, isométrique, coloré et lisible**. Le joueur doit reconnaître en une seconde :
ce qui est un animal, ce qui est un visiteur, qui va bien et qui va mal.

## Style général

- **Flat shading**, pas de textures détaillées : couleurs unies ou petite palette partagée (texture de dégradés).
- Formes simplifiées, silhouettes fortes, peu de polygones (animaux ~300 à 1 500 triangles, visiteurs ~200 à 500).
- Lumière chaude, ombres douces, légère brume de profondeur discrète.
- Caméra orthographique isométrique : pas de perspective, pas de déformation.

## Lisibilité animaux / visiteurs

C'est la priorité n°1 de la direction artistique.

### Animaux

- **Échelle exagérée** par rapport aux visiteurs (un zèbre fait environ 1,5 fois la taille d'un adulte) :
  les animaux sont la vedette, pas le décor.
- **Silhouette distinctive par espèce** : rayures du zèbre, cou de la girafe, crinière du lion, taches noires du panda.
  Test de lisibilité : en silhouette noire sur fond uni, on doit pouvoir nommer l'espèce.
- **Saturation plus forte que le terrain** : le sol est sobre (verts et ocres désaturés), les animaux ressortent.
- **Animations simples mais présentes** : `idle` (respiration, mouvement de queue/oreilles), `walk`, `eat`, `drink`, `sleep`.
  Pas de statue immobile : un animal qui bouge se repère immédiatement.
- **Icône d'espèce** flottante (billboard) au-dessus de chaque enclos, visible au zoom éloigné.
- **Icône d'état** au-dessus de l'animal : 😀 content, 🍖 faim, 💧 soif, 😟 mal-être, 🤒 malade, 💤 dort
  (en sprites maison, pas en emoji système). N'apparaît que si l'état n'est pas « content », ou au survol.

### Visiteurs

- **Deux gabarits clairs** : adulte (grand) et enfant (petit, gros crâne, couleurs vives).
- **Variété par teinte** : couleur de haut, de bas et de peau/cheveux tirées au hasard dans une palette
  (via variantes de matériau ou couleur d'instance). Une foule ne doit pas ressembler à des clones.
- **Comportements lisibles** :
  - arrêt face à l'enclos, tête tournée vers l'animal ;
  - animation « observer » (mains sur la clôture, pointer du doigt, appareil photo) ;
  - bulles d'humeur : ❤️ ravi, ⭐ amusé, 😐 ennuyé, 😠 en colère, 🍔 a faim.
- **Éclats de joie** : petites particules (cœurs, étoiles) quand un visiteur est ravi devant un animal.

### Enclos

- Clôtures d'une couleur nette (bois clair ou vert foncé) et de hauteur basse pour ne jamais masquer l'animal.
- **Zone d'observation** : léger marquage au sol (plateforme ou bordure) sur le chemin adjacent, pour que
  le joueur voie où les visiteurs s'arrêtent.
- Tuiles d'enclos teintées au survol ou à la sélection pour visualiser la surface.
- Panneau d'info (pancarte) à l'entrée de l'enclos : icône de l'espèce, nombre d'animaux, état global.

## Palette (point de départ)

| Usage | Couleurs |
|---|---|
| Sol savane | ocre doux `#C9B26B`, `#B89F55` |
| Sol forêt | vert profond `#4F7A4A` |
| Herbe | vert tendre `#7DB35B` |
| Sable | beige `#E3D3A1` |
| Eau | bleu clair translucide `#6FB7D9` |
| Chemins | gris-beige chaud `#D8CFC0` |
| Clôtures | bois `#9A6B3F` |
| Interface | crème `#FFF6E5`, accent vert `#3E8E5A`, alerte corail `#E4604B` |

Les couleurs d'animaux restent proches de la réalité mais **un cran plus saturées** (contraste avec le terrain).

## Interface

- Style arrondi, lisible, chaleureux. Icônes simples, texte court.
- Grandes zones tactiles (≥ 44 px) dès le POC pour ne pas bloquer le mobile plus tard.
- Retour visuel immédiat sur chaque action (aperçu vert/rouge, petite animation de placement, son plus tard).

## Accessibilité visuelle

- **Jamais la couleur seule** : chaque état d'animal ou de visiteur combine icône, forme et couleur ; l'aperçu de placement valide/invalide
  utilise aussi un symbole (✓ / ✗) et un motif.
- Contrastes vérifiés (texte ≥ 4,5:1, éléments d'interface ≥ 3:1).
- Vérification sous simulation de daltonisme (protanopie, deutéranopie, tritanopie, achromatopsie) à chaque itération.
- Mouvement réductible (`prefers-reduced-motion`), pas de clignotement rapide.
- Détails et checklist dans `09-verification-visuelle-et-accessibilite.md`.

## Sources d'assets

Ordre de préférence :

1. **Modèles procéduraux maison** (primitives assemblées en code) : utilisés dès l'itération 1, toujours disponibles en repli.
2. **Packs CC0 low poly** (par exemple Kenney, Quaternius) : vérifier la licence exacte et la présence des
   animaux voulus au moment du téléchargement, et consigner chaque source dans `public/assets/CREDITS.md`.
3. **Modèles faits ou retouchés sous Blender** pour combler les manques d'espèces ou de style.

Format cible : **glTF / GLB**, échelle cohérente (1 unité = 1 tuile), pivot au sol, animations nommées
(`Idle`, `Walk`, `Eat`, `Drink`, `Sleep`, `Watch`).

## Règles de cohérence

- Un seul style de polygones et de palette pour tous les assets : si un pack détonne, on le re-teinte.
- Chaque nouvel asset passe le « test de silhouette » et le « test d'échelle » (posé à côté d'un visiteur).
- Pas d'asset dont la licence n'est pas clairement documentée.
