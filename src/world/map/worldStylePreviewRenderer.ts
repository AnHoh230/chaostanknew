import {
  Color3,
  Material,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  TransformNode,
  VertexData,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { createTankView } from '../../tank/tankFactory';
import type { TankComposition } from '../../tank/sockets';
import type { WorldStyleKit } from './assetDemandTypes';
import { buildRoadCapGeometry, buildRoadRibbonGeometry } from './styleRoadGeometry';
import {
  buildCellSurfaceGeometry,
  buildTransitionGeometry,
  type MeshGeometryData,
} from './styleSurfaceGeometry';
import type {
  EntranceAssetPlacement,
  LandscapeAssetPlacement,
  SiteAssetPlacement,
  WorldAssetPlacement,
  WorldAssetPlacementPlan,
} from './worldAssetPlacement';
import type { Footprint } from './worldTypes';

const HEIGHT = {
  ground: 0.025,
  transition: 0.04,
  roadEdge: 0.055,
  roadSurface: 0.065,
  decal: 0.075,
} as const;

export interface WorldStylePreviewHandle {
  root: TransformNode;
  meshCount: number;
  playerReference?: WorldStylePlayerReference;
  dispose(): void;
}

export interface WorldStylePlayerReference {
  root: TransformNode;
  locator: Mesh;
  collisionRing: Mesh;
  collisionDiameter: number;
  setScaleView(enabled: boolean): void;
}

export interface WorldStylePreviewOptions {
  player?: {
    position: { x: number; z: number };
    collisionRadius: number;
    composition: TankComposition;
  };
}

function emptyGeometry(): MeshGeometryData {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function appendGeometry(target: MeshGeometryData, source: MeshGeometryData): void {
  const offset = target.positions.length / 3;
  target.positions.push(...source.positions);
  target.normals.push(...source.normals);
  target.uvs.push(...source.uvs);
  target.indices.push(...source.indices.map((index) => index + offset));
}

function colorFromHex(value: string, label: string): Color3 {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) throw new Error(`invalid-style-palette-color:${label}:${value}`);
  const numeric = Number.parseInt(match[1]!, 16);
  return new Color3(((numeric >> 16) & 255) / 255, ((numeric >> 8) & 255) / 255, (numeric & 255) / 255);
}

function assetUrl(file: string): string {
  return file.startsWith('/') ? file : `./${file}`;
}

class MaterialStore {
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly loadTextures: boolean;

  constructor(private readonly scene: Scene, private readonly kit: WorldStyleKit) {
    this.loadTextures = scene.getEngine().getClassName() !== 'NullEngine';
  }

  texture(file: string, transparent = false): StandardMaterial {
    const key = `texture:${transparent ? 'alpha' : 'opaque'}:${file}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(`style_material_${this.materials.size}`, this.scene);
    material.diffuseColor = Color3.White();
    material.specularColor = new Color3(0.025, 0.025, 0.025);
    material.disableLighting = transparent;
    material.emissiveColor = transparent ? Color3.White() : Color3.Black();
    if (this.loadTextures) {
      const texture = new Texture(assetUrl(file), this.scene);
      texture.wrapU = Texture.WRAP_ADDRESSMODE;
      texture.wrapV = Texture.WRAP_ADDRESSMODE;
      texture.anisotropicFilteringLevel = 16;
      texture.hasAlpha = transparent;
      material.diffuseTexture = texture;
      material.useAlphaFromDiffuseTexture = transparent;
      material.transparencyMode = transparent
        ? Material.MATERIAL_ALPHATESTANDBLEND
        : Material.MATERIAL_OPAQUE;
    } else {
      material.diffuseColor = colorFromHex(this.kit.globalStyle.palette.concrete ?? '#596166', 'concrete');
    }
    this.materials.set(key, material);
    return material;
  }

  palette(slot: string): StandardMaterial {
    const key = `palette:${slot}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const value = this.kit.globalStyle.palette[slot];
    if (!value) throw new Error(`style-palette-slot-missing:${this.kit.id}:${slot}`);
    const material = new StandardMaterial(`style_material_${this.materials.size}`, this.scene);
    material.diffuseColor = colorFromHex(value, slot);
    material.specularColor = new Color3(0.025, 0.025, 0.025);
    this.materials.set(key, material);
    return material;
  }

  missing(): StandardMaterial {
    const key = 'diagnostic:missing';
    const existing = this.materials.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(`style_material_${this.materials.size}`, this.scene);
    material.diffuseColor = new Color3(1, 0.02, 0.62);
    material.emissiveColor = new Color3(0.65, 0, 0.35);
    material.specularColor = Color3.Black();
    material.alpha = 0.78;
    material.wireframe = true;
    material.backFaceCulling = false;
    this.materials.set(key, material);
    return material;
  }

  dispose(): void {
    for (const material of this.materials.values()) material.dispose(false, true);
    this.materials.clear();
  }
}

function createPlayerReference(
  scene: Scene,
  parent: TransformNode,
  options: NonNullable<WorldStylePreviewOptions['player']>,
): WorldStylePlayerReference {
  const root = new TransformNode('asset_lab_player_reference', scene);
  root.parent = parent;
  root.position.set(options.position.x, 0, options.position.z);
  const tank = createTankView(scene, options.composition);
  tank.root.parent = root;

  const locatorMaterial = new StandardMaterial('asset_lab_player_locator_material', scene);
  locatorMaterial.diffuseColor = new Color3(0.12, 0.96, 0.92);
  locatorMaterial.emissiveColor = new Color3(0.06, 0.72, 0.7);
  locatorMaterial.specularColor = Color3.Black();
  const locator = MeshBuilder.CreateTorus('asset_lab_player_locator', {
    diameter: 12,
    thickness: 0.32,
    tessellation: 48,
  }, scene);
  locator.position.y = 0.22;
  locator.material = locatorMaterial;
  locator.parent = root;
  locator.isPickable = false;

  const collisionMaterial = new StandardMaterial('asset_lab_player_collision_material', scene);
  collisionMaterial.diffuseColor = new Color3(0.28, 1, 0.82);
  collisionMaterial.emissiveColor = new Color3(0.08, 0.5, 0.38);
  collisionMaterial.specularColor = Color3.Black();
  const collisionRing = MeshBuilder.CreateTorus('asset_lab_player_collision', {
    diameter: options.collisionRadius * 2,
    thickness: 0.08,
    tessellation: 40,
  }, scene);
  collisionRing.position.y = 0.12;
  collisionRing.material = collisionMaterial;
  collisionRing.parent = root;
  collisionRing.isPickable = false;
  collisionRing.isVisible = false;

  return {
    root,
    locator,
    collisionRing,
    collisionDiameter: options.collisionRadius * 2,
    setScaleView(enabled: boolean): void {
      locator.isVisible = !enabled;
      collisionRing.isVisible = enabled;
    },
  };
}

function requiredFile(files: readonly string[], placementId: string): string {
  const file = files[0];
  if (!file) throw new Error(`style-placement-has-no-file:${placementId}`);
  return file;
}

function meshFromGeometry(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  name: string,
  geometry: MeshGeometryData,
  material: StandardMaterial,
  height: number,
): Mesh | null {
  if (geometry.indices.length === 0) return null;
  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = geometry.positions;
  vertexData.normals = geometry.normals;
  vertexData.uvs = geometry.uvs;
  vertexData.indices = geometry.indices;
  vertexData.applyToMesh(mesh);
  mesh.material = material;
  mesh.position.y = height;
  mesh.parent = root;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  meshes.push(mesh);
  return mesh;
}

function spriteMesh(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  materials: MaterialStore,
  name: string,
  position: { x: number; z: number },
  rotation: number,
  footprint: Footprint,
  file: string,
): void {
  const mesh = MeshBuilder.CreateGround(name, {
    width: footprint.halfX * 2,
    height: footprint.halfZ * 2,
  }, scene);
  mesh.position.set(position.x, HEIGHT.decal, position.z);
  mesh.rotation.y = rotation;
  mesh.material = materials.texture(file, true);
  mesh.parent = root;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  meshes.push(mesh);
}

function renderSpritePlacement(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  materials: MaterialStore,
  placement: LandscapeAssetPlacement | SiteAssetPlacement | EntranceAssetPlacement,
): void {
  if (placement.asset.status !== 'resolved') {
    throw new Error(`style-preview-unresolved-sprite:${placement.id}`);
  }
  if (placement.asset.geometryRecipe) {
    throw new Error(`style-preview-scripted-geometry-forbidden:${placement.id}:${placement.asset.geometryRecipe}`);
  }
  const footprint = placement.kind === 'entrance'
    ? { halfX: Math.max(2, placement.width / 2 + 1), halfZ: 2.5 }
    : placement.footprint;
  const file = requiredFile(placement.asset.files, placement.id);
  spriteMesh(
    scene,
    root,
    meshes,
    materials,
    `style_sprite_${placement.id}`,
    placement.position,
    placement.rotation,
    footprint,
    file,
  );
}

function renderMissingPlacement(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  materials: MaterialStore,
  placement: WorldAssetPlacement,
): void {
  const material = materials.missing();
  const name = `style_missing_${placement.id}`;
  if (placement.kind === 'ground') {
    meshFromGeometry(
      scene,
      root,
      meshes,
      name,
      buildCellSurfaceGeometry(placement.grid, placement.cells, 16),
      material,
      HEIGHT.ground + 0.02,
    );
    return;
  }
  if (placement.kind === 'transition') {
    const canonicalForward = placement.fromBiome.localeCompare(placement.toBiome) <= 0;
    const normal = canonicalForward
      ? placement.normal
      : { x: -placement.normal.x, z: -placement.normal.z };
    meshFromGeometry(
      scene,
      root,
      meshes,
      name,
      buildTransitionGeometry({
        center: placement.center,
        tangent: placement.tangent,
        normal,
        length: placement.length,
      }, Math.min(6, placement.length * 0.6), 16),
      material,
      HEIGHT.transition + 0.02,
    );
    return;
  }
  if (placement.kind === 'corridor') {
    const width = placement.layer === 'edge' ? placement.width + 3 : placement.width;
    const geometry = buildRoadRibbonGeometry(placement.centerline, width, 16);
    const radius = width / 2;
    const start = placement.centerline[0];
    const end = placement.centerline.at(-1);
    if (start) appendGeometry(geometry, buildRoadCapGeometry(start, radius, 16));
    if (end) appendGeometry(geometry, buildRoadCapGeometry(end, radius, 16));
    meshFromGeometry(scene, root, meshes, name, geometry, material, HEIGHT.roadSurface + 0.02);
    return;
  }
  if (placement.kind === 'junction') {
    meshFromGeometry(
      scene,
      root,
      meshes,
      name,
      buildRoadCapGeometry(placement.position, placement.degree === 4 ? 10 : 9, 16),
      material,
      HEIGHT.roadSurface + 0.02,
    );
    return;
  }

  if (placement.kind === 'site') {
    const diameter = Math.max(2, placement.footprint.halfX * 2);
    const mesh = MeshBuilder.CreateTorus(name, {
      diameter,
      thickness: 0.28,
      tessellation: 64,
    }, scene);
    mesh.scaling.z = placement.footprint.halfZ / Math.max(0.001, placement.footprint.halfX);
    mesh.position.set(placement.position.x, HEIGHT.decal + 0.14, placement.position.z);
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    meshes.push(mesh);
    return;
  }

  const footprint = placement.kind === 'entrance'
    ? { halfX: Math.max(2, placement.width / 2 + 1), halfZ: 2.5 }
    : placement.footprint;
  const height = placement.kind === 'entrance'
      ? 1.5
      : placement.role === 'landmark'
        ? 4
        : 2.5;
  const mesh = MeshBuilder.CreateBox(name, {
    width: Math.max(2, footprint.halfX * 2),
    depth: Math.max(2, footprint.halfZ * 2),
    height,
  }, scene);
  mesh.position.set(placement.position.x, height / 2 + HEIGHT.decal, placement.position.z);
  mesh.rotation.y = placement.rotation;
  mesh.material = material;
  mesh.parent = root;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  meshes.push(mesh);
}

export function createWorldStylePreview(
  scene: Scene,
  plan: WorldAssetPlacementPlan,
  kit: WorldStyleKit,
  options: WorldStylePreviewOptions = {},
): WorldStylePreviewHandle {
  if (plan.kitId !== kit.id || plan.kitVersion !== kit.version || plan.catalogSignature !== kit.catalogSignature) {
    throw new Error(`style-preview-kit-mismatch:${plan.kitId}:${kit.id}`);
  }
  const root = new TransformNode('worldStylePreviewRoot', scene);
  const meshes: Mesh[] = [];
  const materials = new MaterialStore(scene, kit);
  let playerReference: WorldStylePlayerReference | undefined;
  const groupedGeometry = new Map<string, { geometry: MeshGeometryData; file: string; height: number; name: string }>();
  const group = (key: string, file: string, height: number, name: string): MeshGeometryData => {
    const existing = groupedGeometry.get(key);
    if (existing) return existing.geometry;
    const geometry = emptyGeometry();
    groupedGeometry.set(key, { geometry, file, height, name });
    return geometry;
  };

  const cleanup = (): void => {
    for (const mesh of [...meshes]) mesh.dispose(false, false);
    meshes.length = 0;
    root.dispose(false, true);
    materials.dispose();
  };

  try {
    for (const placement of plan.placements) {
      if (placement.asset.status === 'missing') {
        renderMissingPlacement(scene, root, meshes, materials, placement);
        continue;
      }
      const file = requiredFile(placement.asset.files, placement.id);
      if (placement.kind === 'ground') {
        meshFromGeometry(
          scene,
          root,
          meshes,
          `style_ground_${placement.biomeId}`,
          buildCellSurfaceGeometry(placement.grid, placement.cells, 16),
          materials.texture(file),
          HEIGHT.ground,
        );
      } else if (placement.kind === 'transition') {
        const canonicalForward = placement.fromBiome.localeCompare(placement.toBiome) <= 0;
        const normal = canonicalForward
          ? placement.normal
          : { x: -placement.normal.x, z: -placement.normal.z };
        appendGeometry(
          group(`transition:${file}`, file, HEIGHT.transition, 'style_transition'),
          buildTransitionGeometry({
            center: placement.center,
            tangent: placement.tangent,
            normal,
            length: placement.length,
          }, Math.min(6, placement.length * 0.6), 16),
        );
      } else if (placement.kind === 'corridor') {
        const width = placement.layer === 'edge' ? placement.width + 3 : placement.width;
        const height = placement.layer === 'edge' ? HEIGHT.roadEdge : HEIGHT.roadSurface;
        const geometry = group(
          `road:${placement.layer}:${file}`,
          file,
          height,
          `style_road_${placement.layer}`,
        );
        appendGeometry(geometry, buildRoadRibbonGeometry(placement.centerline, width, 16));
        const radius = width / 2;
        const start = placement.centerline[0];
        const end = placement.centerline.at(-1);
        if (start) appendGeometry(geometry, buildRoadCapGeometry(start, radius, 16));
        if (end) appendGeometry(geometry, buildRoadCapGeometry(end, radius, 16));
      } else if (placement.kind === 'junction') {
        appendGeometry(
          group(`junction:${file}`, file, HEIGHT.roadSurface, 'style_road_junction'),
          buildRoadCapGeometry(placement.position, placement.degree === 4 ? 10 : 9, 16),
        );
      } else {
        renderSpritePlacement(scene, root, meshes, materials, placement);
      }
    }

    for (const entry of groupedGeometry.values()) {
      meshFromGeometry(
        scene,
        root,
        meshes,
        entry.name,
        entry.geometry,
        materials.texture(entry.file, entry.height !== HEIGHT.roadSurface),
        entry.height,
      );
    }
    if (options.player) playerReference = createPlayerReference(scene, root, options.player);
  } catch (error) {
    cleanup();
    throw error;
  }

  return {
    root,
    meshCount: meshes.length,
    ...(playerReference ? { playerReference } : {}),
    dispose: cleanup,
  };
}
