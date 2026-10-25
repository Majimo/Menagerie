import { BoxGeometry, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { palette } from './palette';

// Registre d'assets : un modèle est demandé par id. Le chargement glTF arrive avec les premiers modèles ;
// en attendant, et en cas d'absence, un modèle procédural est fabriqué (le jeu reste jouable sans asset).

type ProceduralFactory = () => Object3D;

const procedural: Record<string, ProceduralFactory> = {
  'debug-cube': () => {
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: palette.savanna, flatShading: true }),
    );
    mesh.castShadow = true;
    mesh.position.y = 0.5;
    return mesh;
  },
};

/** Modèle procédural affiché quand l'id est inconnu : visible, sans faire planter le jeu. */
function missingModel(): Object3D {
  return new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: palette.uiAlert }));
}

export function getModel(modelId: string): Object3D {
  const factory = procedural[modelId];
  return factory ? factory() : missingModel();
}
