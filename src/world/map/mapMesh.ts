/**
 * Platzhalter-Mesh-Fabrik: baut aus der parametrischen AssetDef.mesh-Beschreibung
 * (Form/Größe/Farbe) ein am Ursprung zentriertes Babylon-Mesh. Echte Modelle ersetzen
 * das später, ohne dass Generator/Loader sich ändern.
 */
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { AssetDef } from './assetKit';

export function baueAssetMesh(scene: Scene, def: AssetDef, name: string): Mesh {
  const s = def.mesh.size;
  let mesh: Mesh;
  switch (def.mesh.form) {
    case 'box':
      mesh = MeshBuilder.CreateBox(name, { width: s.x, height: s.y, depth: s.z }, scene);
      break;
    case 'cylinder':
      mesh = MeshBuilder.CreateCylinder(name, { diameter: s.x, height: s.y, tessellation: 12 }, scene);
      break;
    case 'cone':
      mesh = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: s.x, height: s.y, tessellation: 12 }, scene);
      break;
    case 'sphere':
      mesh = MeshBuilder.CreateSphere(name, { diameter: s.x, segments: 8 }, scene);
      break;
    default:
      throw new Error('Unbekannte Mesh-Form: ' + def.mesh.form);
  }
  const mat = new StandardMaterial(name + '_mat', scene);
  mat.diffuseColor = new Color3(def.mesh.color[0], def.mesh.color[1], def.mesh.color[2]);
  mat.specularColor = new Color3(0, 0, 0);
  mesh.material = mat;
  return mesh;
}
