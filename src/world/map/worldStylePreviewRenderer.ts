import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { WorldStyleKit } from './assetDemandTypes';
import { buildRoadCapGeometry, buildRoadRibbonGeometry } from './styleRoadGeometry';
import { buildStyleGeometryRecipe, type StylePrimitive } from './styleGeometryRecipes';
import {
  buildCellSurfaceGeometry,
  buildTransitionGeometry,
  type MeshGeometryData,
} from './styleSurfaceGeometry';
import type {
  EntranceAssetPlacement,
  LandscapeAssetPlacement,
  SiteAssetPlacement,
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
  dispose(): void;
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

  texture(file: string): StandardMaterial {
    const key = `texture:${file}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(`style_material_${this.materials.size}`, this.scene);
    material.diffuseColor = Color3.White();
    material.specularColor = new Color3(0.025, 0.025, 0.025);
    if (this.loadTextures) {
      const texture = new Texture(assetUrl(file), this.scene);
      texture.wrapU = Texture.WRAP_ADDRESSMODE;
      texture.wrapV = Texture.WRAP_ADDRESSMODE;
      texture.anisotropicFilteringLevel = 16;
      material.diffuseTexture = texture;
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

  dispose(): void {
    for (const material of this.materials.values()) material.dispose(false, true);
    this.materials.clear();
  }
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

function rotatedCenter(local: StylePrimitive['center'], rotation: number): { x: number; z: number } {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: local.x * cosine + local.z * sine,
    z: -local.x * sine + local.z * cosine,
  };
}

function primitiveMesh(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  materials: MaterialStore,
  primitive: StylePrimitive,
  name: string,
  origin: { x: number; z: number },
  rotation: number,
): void {
  const mesh = primitive.shape === 'box'
    ? MeshBuilder.CreateBox(name, {
        width: primitive.size.x,
        height: primitive.size.y,
        depth: primitive.size.z,
      }, scene)
    : MeshBuilder.CreateCylinder(name, { diameter: 1, height: primitive.size.y, tessellation: 16 }, scene);
  if (primitive.shape === 'cylinder') mesh.scaling.set(primitive.size.x, 1, primitive.size.z);
  const local = rotatedCenter(primitive.center, rotation);
  mesh.position = new Vector3(origin.x + local.x, primitive.center.y + HEIGHT.decal, origin.z + local.z);
  mesh.rotation.y = rotation + primitive.rotationY;
  mesh.material = materials.palette(primitive.paletteSlot);
  mesh.parent = root;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  meshes.push(mesh);
}

function decalMesh(
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
  mesh.material = materials.texture(file);
  mesh.parent = root;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  meshes.push(mesh);
}

function renderRecipePlacement(
  scene: Scene,
  root: TransformNode,
  meshes: Mesh[],
  materials: MaterialStore,
  placement: LandscapeAssetPlacement | SiteAssetPlacement | EntranceAssetPlacement,
): void {
  const recipe = placement.asset.geometryRecipe;
  if (!recipe) throw new Error(`style-placement-has-no-recipe:${placement.id}`);
  const footprint = placement.kind === 'entrance'
    ? { halfX: Math.max(2, placement.width / 2 + 1), halfZ: 2.5 }
    : placement.footprint;
  const file = requiredFile(placement.asset.files, placement.id);
  decalMesh(
    scene,
    root,
    meshes,
    materials,
    `style_decal_${placement.id}`,
    placement.position,
    placement.rotation,
    footprint,
    file,
  );
  const primitives = buildStyleGeometryRecipe(recipe, footprint, placement.asset.variantId);
  primitives.forEach((entry, index) => primitiveMesh(
    scene,
    root,
    meshes,
    materials,
    entry,
    `style_primitive_${placement.id}_${index}`,
    placement.position,
    placement.rotation,
  ));
}

export function createWorldStylePreview(
  scene: Scene,
  plan: WorldAssetPlacementPlan,
  kit: WorldStyleKit,
): WorldStylePreviewHandle {
  if (plan.kitId !== kit.id || plan.kitVersion !== kit.version || plan.catalogSignature !== kit.catalogSignature) {
    throw new Error(`style-preview-kit-mismatch:${plan.kitId}:${kit.id}`);
  }
  const root = new TransformNode('worldStylePreviewRoot', scene);
  const meshes: Mesh[] = [];
  const materials = new MaterialStore(scene, kit);
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
    root.dispose();
    materials.dispose();
  };

  try {
    for (const placement of plan.placements) {
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
        renderRecipePlacement(scene, root, meshes, materials, placement);
      }
    }

    for (const entry of groupedGeometry.values()) {
      meshFromGeometry(
        scene,
        root,
        meshes,
        entry.name,
        entry.geometry,
        materials.texture(entry.file),
        entry.height,
      );
    }
  } catch (error) {
    cleanup();
    throw error;
  }

  return {
    root,
    meshCount: meshes.length,
    dispose: cleanup,
  };
}
