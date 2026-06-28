import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { Scene, Mesh } from '@babylonjs/core';
import type { SocketName, TankComposition } from './sockets';
import { SOCKETS } from './sockets';

export interface TankView {
  root: TransformNode;
  turretNode: TransformNode;
  setVariant(socket: SocketName, variantId: string): void;
}

interface SocketRuntime {
  node: TransformNode;
  mesh: Mesh | null;
  variantId: string;
}

function makeMaterial(scene: Scene, name: string, rgb: [number, number, number]): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = new Color3(rgb[0], rgb[1], rgb[2]);
  // Matt halten (wie die Map-Props): der StandardMaterial-Default ist WEISSES Specular (Power 64),
  // das unter dem hellen Licht einen breiten weißen Schleier über den Panzer legt → flach/„weiße
  // Fläche". Niedriges Specular gibt die Flächen-Schattierung (Kontrast) zurück.
  mat.specularColor = new Color3(0.06, 0.06, 0.07);
  return mat;
}

function buildVariantMesh(scene: Scene, socket: SocketName, variantId: string): Mesh {
  let mesh: Mesh;
  switch (socket) {
    case 'chassis': {
      const dims = variantId === 'c_wide'
        ? { width: 2.4, height: 0.6, depth: 3.0 }
        : { width: 1.6, height: 0.8, depth: 2.6 }; // c_box (default)
      // Wanne = dunkelster großer Block (warmes Oliv-Braun). Bildet mit dem kühlen Turm + den fast
      // schwarzen Ketten eine klare Werte-Leiter → der Panzer liest sich als Teile, nicht als heller Klotz.
      const rgb: [number, number, number] = variantId === 'c_wide' ? [0.19, 0.18, 0.13] : [0.24, 0.22, 0.15];
      mesh = MeshBuilder.CreateBox('chassis_mesh', dims, scene);
      mesh.material = makeMaterial(scene, 'chassis_mat', rgb);
      mesh.position = new Vector3(0, 0.4, 0);
      // „Vorne": helle, leicht vorstehende Glacis-Leiste an der +Z-Front. Zeigt, wohin die WANNE
      // ausgerichtet ist (der Turm dreht unabhängig). Als Kind des Chassis → dreht mit dem Fahrwerk.
      const bug = MeshBuilder.CreateBox('chassis_bug', { width: dims.width * 0.8, height: dims.height * 0.6, depth: 0.35 }, scene);
      const bugMat = makeMaterial(scene, 'chassis_bug_mat', [0.92, 0.84, 0.32]);
      bugMat.emissiveColor = new Color3(0.35, 0.32, 0.1); // leicht selbstleuchtend → Front immer erkennbar
      bug.material = bugMat;
      bug.position = new Vector3(0, dims.height * 0.15, dims.depth / 2);
      bug.parent = mesh;
      break;
    }
    case 'wheels':
      if (variantId === 'w_tread') {
        mesh = MeshBuilder.CreateBox('wheels_mesh', { width: 1.9, height: 0.5, depth: 2.8 }, scene);
        mesh.material = makeMaterial(scene, 'wheels_mat', [0.08, 0.08, 0.09]); // fast schwarze Kette = dunkelster Anker
      } else {
        // w_round (default)
        mesh = MeshBuilder.CreateCylinder('wheels_mesh', { diameter: 0.8, height: 2.0 }, scene);
        mesh.rotation = new Vector3(0, 0, Math.PI / 2);
        mesh.material = makeMaterial(scene, 'wheels_mat', [0.10, 0.10, 0.11]);
      }
      mesh.position = new Vector3(0, 0.2, 0);
      break;
    case 'turret':
      // Turm = kühles Stahlgrau, bewusst ANDERER Farbton als die warme Wanne → die beiden Blöcke
      // verschmelzen nicht mehr zu einer Fläche (das war das „einheitlich").
      if (variantId === 't_big') {
        mesh = MeshBuilder.CreateBox('turret_mesh', { width: 1.4, height: 0.7, depth: 1.4 }, scene);
        mesh.material = makeMaterial(scene, 'turret_mat', [0.30, 0.31, 0.34]);
      } else {
        // t_small (default)
        mesh = MeshBuilder.CreateBox('turret_mesh', { width: 1.0, height: 0.5, depth: 1.0 }, scene);
        mesh.material = makeMaterial(scene, 'turret_mat', [0.34, 0.35, 0.38]);
      }
      mesh.position = new Vector3(0, 0.25, 0);
      break;
    case 'weapon':
      if (variantId === 'g_long') {
        mesh = MeshBuilder.CreateCylinder('weapon_mesh', { diameter: 0.22, height: 2.4 }, scene);
        mesh.material = makeMaterial(scene, 'weapon_mat', [0.15, 0.15, 0.17]); // dunkles Geschützrohr
        mesh.position = new Vector3(0, 0, 1.4);
      } else {
        // g_short (default)
        mesh = MeshBuilder.CreateCylinder('weapon_mesh', { diameter: 0.28, height: 1.4 }, scene);
        mesh.material = makeMaterial(scene, 'weapon_mat', [0.17, 0.17, 0.19]);
        mesh.position = new Vector3(0, 0, 0.9);
      }
      mesh.rotation = new Vector3(Math.PI / 2, 0, 0);
      break;
    default: {
      const _exhaustive: never = socket;
      throw new Error('Unknown socket: ' + String(_exhaustive));
    }
  }
  return mesh;
}

export function createTankView(scene: Scene, comp: TankComposition): TankView {
  const root = new TransformNode('tank_root', scene);

  const runtimes: Record<SocketName, SocketRuntime> = {} as Record<SocketName, SocketRuntime>;

  for (const socket of SOCKETS) {
    const node = new TransformNode('socket_' + socket, scene);
    node.parent = root;
    runtimes[socket] = { node, mesh: null, variantId: comp[socket] };
  }

  // socket_turret sitzt höher; weapon hängt unter turret
  runtimes.turret.node.position = new Vector3(0, 0.9, 0);
  runtimes.weapon.node.parent = runtimes.turret.node;
  runtimes.weapon.node.position = new Vector3(0, 0.25, 0);

  function applyVariant(socket: SocketName, variantId: string): void {
    const rt = runtimes[socket];
    if (rt.mesh) {
      rt.mesh.dispose();
      rt.mesh = null;
    }
    const mesh = buildVariantMesh(scene, socket, variantId);
    mesh.parent = rt.node;
    rt.mesh = mesh;
    rt.variantId = variantId;
  }

  for (const socket of SOCKETS) {
    applyVariant(socket, comp[socket]);
  }

  return {
    root,
    turretNode: runtimes.turret.node,
    setVariant(socket: SocketName, variantId: string): void {
      applyVariant(socket, variantId);
    },
  };
}
