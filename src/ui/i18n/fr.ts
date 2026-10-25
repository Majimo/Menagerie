// Textes visibles par le joueur. Les composants n'utilisent que des clés.

export const fr = {
  'app.title': 'Ménagerie',
  'app.heading': 'Ménagerie, jeu de gestion de zoo',
  'scene.label': 'Vue isométrique du zoo',
  'debug.fps': 'FPS',
  'debug.tick': 'Tick',
  'commands.notImplemented': "Cette action n'est pas encore disponible.",
} as const;

export type TextKey = keyof typeof fr;
