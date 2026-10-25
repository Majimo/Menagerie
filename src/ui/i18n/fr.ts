// Textes visibles par le joueur. Les composants n'utilisent que des clés.
// `{nom}` : valeur insérée par `t(clé, { nom: … })`.

export const fr = {
  'app.title': 'Ménagerie',
  'app.heading': 'Ménagerie, jeu de gestion de zoo',
  'scene.label': 'Vue isométrique du zoo',
  'debug.fps': 'FPS',
  'debug.tick': 'Tick',

  'world.entrance': 'Entrée',
  'world.exit': 'Sortie',

  'money.label': 'Argent',

  'toolbar.label': 'Construction',
  'tool.path': 'Chemin',
  'tool.path.help': 'Chemin : glisser pour tracer une ligne ({cost} par tuile)',
  'tool.fence': 'Clôture',
  'tool.fence.help': 'Clôture : glisser d’un coin à l’autre pour fermer un enclos ({cost} par segment)',
  'tool.biome': 'Biome',
  'tool.biome.help': 'Biome : glisser pour peindre une zone ({cost} par tuile)',
  'tool.demolish': 'Démolir',
  'tool.demolish.help': 'Démolir : chemins et clôtures, la moitié du coût est remboursée',

  'biome.label': 'Biome à peindre',
  'biome.savanna': 'Savane',
  'biome.forest': 'Forêt',
  'biome.grass': 'Herbe',
  'biome.sand': 'Sable',
  'biome.water': 'Eau',

  'camera.label': 'Caméra',
  'camera.rotateLeft': 'Tourner la vue à gauche (A)',
  'camera.rotateRight': 'Tourner la vue à droite (E)',
  'camera.zoomIn': 'Zoomer (+)',
  'camera.zoomOut': 'Dézoomer (−)',

  'tooltip.enclosure': 'Enclos n° {id} : {area} tuiles',
  'tooltip.cost': 'Coût : {amount}',
  'tooltip.refund': 'Remboursement : {amount}',
  'tooltip.count': '{count} éléments',

  'outcome.partial': '{refused} sur {total} refusés : {reason}',

  'error.outOfBounds': 'Hors de la carte.',
  'error.notEnoughMoney': 'Pas assez d’argent.',
  'error.alreadyPath': 'Il y a déjà un chemin ici.',
  'error.alreadyFenced': 'Il y a déjà une clôture ici.',
  'error.alreadyBiome': 'Cette tuile a déjà ce biome.',
  'error.protectedTile': 'L’entrée et la sortie du zoo ne se modifient pas.',
  'error.tileIsPath': 'On ne peint pas un chemin : démolissez-le d’abord.',
  'error.nothingToDemolish': 'Rien à démolir ici.',
  'error.notInEnclosure': 'Il faut un enclos fermé : placez-le à l’intérieur des clôtures.',
  'error.tileOccupied': 'Il y a déjà un objet sur cette tuile.',
  'error.tileIsWater': 'Impossible sur l’eau.',
  'error.incompatibleSpecies':
    'Impossible : {species} ne peut pas vivre avec {other}. Carnivores et herbivores ont des enclos séparés.',
  'error.groupFull': 'Enclos complet pour {species} : {max} au plus par enclos.',

  'species.zebra': 'Zèbre',
  'species.giraffe': 'Girafe',
  'species.lion': 'Lion',
  'species.panda': 'Panda',
  // Avec article, pour les phrases : « le lion », « les zèbres ».
  'species.zebra.the': 'le zèbre',
  'species.giraffe.the': 'la girafe',
  'species.lion.the': 'le lion',
  'species.panda.the': 'le panda',
  'species.zebra.plural': 'les zèbres',
  'species.giraffe.plural': 'les girafes',
  'species.lion.plural': 'les lions',
  'species.panda.plural': 'les pandas',
} as const;

export type TextKey = keyof typeof fr;
