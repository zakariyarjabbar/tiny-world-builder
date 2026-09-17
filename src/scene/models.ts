import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AssetId } from "../editor/world";

const geometries = {
  box: new T.BoxGeometry(1, 1, 1),
  rounded: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  ball: new T.IcosahedronGeometry(1, 2),
  stone: new T.IcosahedronGeometry(1, 0),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
  cone: new T.ConeGeometry(1, 1, 9),
};
const materials = new Map<string, T.MeshStandardMaterial>();
function mat(color: string, glow = false) {
  const key = color + glow;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.88,
        emissive: glow ? color : "#000000",
        emissiveIntensity: glow ? 0.12 : 0,
      }),
    );
  return materials.get(key)!;
}
export function updateGlow(amount: number) {
  materials.forEach((m, key) => {
    if (key.endsWith("true")) m.emissiveIntensity = amount;
  });
}
const P = {
  wood: "#966743",
  dark: "#594938",
  cream: "#eee2bf",
  roof: "#bf6647",
  roofLight: "#d27b56",
  green: "#809b46",
  light: "#adc369",
  pine: "#527d56",
  leaf: "#7da756",
  pink: "#e9a59a",
  stone: "#a8b5a3",
  gold: "#ffce76",
};
function part(
  g: T.Group,
  shape: keyof typeof geometries,
  color: string,
  pos: number[],
  scale: number[],
  rot: number[] = [],
  glow = false,
) {
  const mesh = new T.Mesh(geometries[shape], mat(color, glow));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
function roof(
  g: T.Group,
  width: number,
  depth: number,
  y: number,
  color = P.roof,
) {
  // Two pitched panels with a ridge; open triangular ends are closed by a gable prism.
  const s = new T.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, width * 0.49);
  s.closePath();
  const geo = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = new T.Mesh(geo, mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  const slope = Math.atan(0.98),
    len = width * 0.7;
  for (const side of [-1, 1])
    part(
      g,
      "rounded",
      side === 1 ? color : P.roofLight,
      [side * width * 0.25, y + width * 0.24, 0],
      [len, 0.09, depth + 0.13],
      [0, 0, -side * slope],
    );
  for (let z = -depth / 2 + 0.05; z < depth / 2; z += 0.24)
    for (const side of [-1, 1])
      part(
        g,
        "box",
        "#b76246",
        [side * width * 0.25, y + width * 0.24 + 0.052, z],
        [len, 0.017, 0.022],
        [0, 0, -side * slope],
      );
}
function tree(g: T.Group, kind: string) {
  part(g, "cylinder", P.wood, [0, 0.65, 0], [0.12, 1.3, 0.12]);
  if (kind === "pine") {
    for (let i = 0; i < 3; i++)
      part(
        g,
        "cone",
        [P.pine, "#60895a", "#719765"][i],
        [0, 1 + i * 0.43, 0],
        [0.68 - i * 0.14, 1.2, 0.68 - i * 0.14],
      );
    return;
  }
  part(
    g,
    "cylinder",
    P.wood,
    [0.21, 0.96, 0],
    [0.065, 0.6, 0.065],
    [0, 0, -0.65],
  );
  const willow = kind === "willow";
  part(
    g,
    "ball",
    willow ? "#8faf65" : P.green,
    [0, 1.8, 0],
    [0.83, willow ? 1.02 : 0.78, 0.78],
  );
  part(
    g,
    "ball",
    willow ? "#9cb973" : P.light,
    [-0.43, 1.58, 0.28],
    [0.56, 0.64, 0.58],
  );
  part(
    g,
    "ball",
    willow ? "#829f58" : "#8caa50",
    [0.5, 1.6, 0.12],
    [0.59, 0.61, 0.58],
  );
  part(g, "ball", "#a4bd68", [0.08, 2.17, -0.08], [0.58, 0.53, 0.55]);
}
function flower(g: T.Group, x: number, z: number, color: string, height = 0.3) {
  part(g, "cylinder", "#68844b", [x, height * 0.5, z], [0.022, height, 0.022]);
  part(g, "ball", color, [x, height, z], [0.09, 0.075, 0.09]);
  for (let a = 0; a < 6; a++)
    part(
      g,
      "ball",
      color,
      [
        x + Math.cos((a * Math.PI) / 3) * 0.083,
        height,
        z + Math.sin((a * Math.PI) / 3) * 0.083,
      ],
      [0.075, 0.045, 0.07],
    );
  part(g, "ball", "#e1b65b", [x, height + 0.038, z], [0.046, 0.04, 0.046]);
}
function buildModel(type: AssetId): T.Group {
  const g = new T.Group();
  if (type === "cottage" || type === "cabin") {
    const cabin = type === "cabin";
    part(g, "rounded", "#acaa90", [0, 0.09, 0], [1.65, 0.18, 1.4]);
    part(
      g,
      "rounded",
      cabin ? "#b39164" : P.cream,
      [0, 0.69, 0],
      [1.43, 1.2, 1.2],
    );
    if (cabin)
      for (let y = 0.2; y < 1.25; y += 0.17)
        part(g, "box", "#977347", [0, y, 0.613], [1.43, 0.026, 0.025]);
    roof(g, 1.78, 1.57, 1.2, cabin ? "#6f7c60" : P.roof);
    part(g, "rounded", P.dark, [0.18, 0.45, 0.624], [0.37, 0.73, 0.08]);
    part(g, "rounded", "#bc8f59", [0.18, 0.45, 0.675], [0.29, 0.66, 0.035]);
    part(g, "ball", "#dbbf74", [0.27, 0.45, 0.706], [0.025, 0.025, 0.025]);
    for (const x of [-0.43, 0.49]) {
      part(g, "box", "#775c40", [x, 0.84, 0.629], [0.34, 0.37, 0.06]);
      part(g, "box", P.gold, [x, 0.84, 0.665], [0.25, 0.28, 0.018], [], true);
      part(g, "box", P.cream, [x, 0.84, 0.687], [0.032, 0.3, 0.028]);
      part(g, "box", P.cream, [x, 0.84, 0.687], [0.28, 0.034, 0.028]);
    }
    part(g, "box", P.dark, [0.727, 0.78, -0.05], [0.026, 0.35, 0.38]);
    part(g, "box", P.gold, [0.745, 0.78, -0.05], [0.02, 0.27, 0.3], [], true);
    part(g, "box", P.cream, [0.76, 0.78, -0.05], [0.025, 0.29, 0.035]);
    part(g, "rounded", "#ded8bd", [0.18, 0.11, 0.85], [0.6, 0.14, 0.38]);
    part(g, "rounded", "#a38b70", [-0.48, 1.99, -0.35], [0.24, 0.83, 0.27]);
    part(g, "box", "#c6b39a", [-0.48, 2.41, -0.35], [0.3, 0.1, 0.32]);
    if (!cabin) {
      part(g, "box", P.wood, [-0.44, 0.54, 0.74], [0.42, 0.16, 0.18]);
      for (let i = 0; i < 3; i++)
        flower(g, -0.59 + i * 0.14, 0.76, "#d89181", 0.72);
    }
  } else if (["oak", "pine", "willow"].includes(type)) tree(g, type);
  else if (type === "windmill") {
    part(g, "cylinder", P.cream, [0, 0.8, 0], [0.48, 1.6, 0.48]);
    part(g, "cone", P.roof, [0, 1.9, 0], [0.65, 0.8, 0.65]);
    part(g, "box", P.dark, [0, 0.4, 0.49], [0.25, 0.55, 0.03]);
    const blades = new T.Group();
    blades.name = "blades";
    blades.position.set(0, 1.53, 0.58);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4;
      part(
        blades,
        "rounded",
        P.wood,
        [Math.sin(a) * 0.49, Math.cos(a) * 0.49, 0],
        [0.15, 1.08, 0.065],
        [0, 0, -a],
      );
      part(
        blades,
        "box",
        P.cream,
        [Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0.045],
        [0.28, 0.57, 0.036],
        [0, 0, -a],
      );
    }
    g.add(blades);
    part(g, "ball", P.dark, [0, 1.53, 0.67], [0.13, 0.13, 0.1]);
  } else if (type === "flowers")
    for (let i = 0; i < 7; i++)
      flower(
        g,
        Math.sin(i * 2.4) * 0.28,
        Math.cos(i * 2.4) * 0.22,
        ["#f2dab0", "#f0eee0", "#de927f"][i % 3],
        0.21 + (i % 3) * 0.07,
      );
  else if (type === "bush") {
    for (let i = 0; i < 3; i++)
      part(
        g,
        "ball",
        i % 2 ? P.green : P.light,
        [(i - 1) * 0.23, 0.25, 0],
        [0.31, 0.34, 0.33],
      );
    for (let i = 0; i < 7; i++)
      part(
        g,
        "ball",
        "#c47f78",
        [Math.sin(i * 2) * 0.42, 0.44 + (i % 2) * 0.07, Math.cos(i * 2) * 0.2],
        [0.045, 0.045, 0.045],
      );
  } else if (type === "rock") {
    part(g, "stone", P.stone, [0, 0.25, 0], [0.5, 0.39, 0.39], [0.3, 0.4, 0.1]);
    part(g, "stone", "#b8c0ac", [0.33, 0.13, 0.25], [0.26, 0.2, 0.28]);
    part(g, "stone", "#909d8a", [-0.36, 0.09, 0.2], [0.18, 0.15, 0.2]);
  } else if (type === "stones")
    for (let i = 0; i < 3; i++)
      part(
        g,
        "cylinder",
        ["#d3ccae", "#c3c1a5", "#dbd1b8"][i],
        [Math.sin(i * 2) * 0.1, 0.05, (i - 1) * 0.33],
        [0.24, 0.1, 0.17],
        [0, i, 0],
      );
  else if (type === "grass")
    for (let i = 0; i < 7; i++)
      part(
        g,
        "cone",
        i % 2 ? P.green : P.light,
        [Math.sin(i * 4) * 0.18, 0.16, Math.cos(i * 4) * 0.18],
        [0.045, 0.3 + (i % 3) * 0.08, 0.035],
        [0.2 * Math.sin(i), 0, 0.15 * Math.cos(i)],
      );
  else if (type === "stump") {
    part(g, "cylinder", P.wood, [0, 0.21, 0], [0.31, 0.42, 0.3]);
    part(g, "cylinder", "#d3b583", [0, 0.428, 0], [0.29, 0.015, 0.28]);
    part(g, "cylinder", "#b49668", [0, 0.439, 0], [0.16, 0.014, 0.15]);
    part(g, "cylinder", "#dbc59c", [0, 0.45, 0], [0.11, 0.01, 0.1]);
  } else if (type === "bench") {
    for (const x of [-0.42, 0.42]) {
      part(g, "box", P.dark, [x, 0.22, 0], [0.1, 0.44, 0.47]);
      part(g, "box", P.dark, [x, 0.57, -0.19], [0.08, 0.7, 0.08], [0.12, 0, 0]);
    }
    for (let i = 0; i < 3; i++)
      part(
        g,
        "rounded",
        "#c4985e",
        [0, 0.47, (i - 1) * 0.17],
        [1.17, 0.09, 0.145],
      );
    for (let i = 0; i < 2; i++)
      part(
        g,
        "rounded",
        "#c4985e",
        [0, 0.7 + i * 0.18, -0.24],
        [1.17, 0.13, 0.06],
        [0.12, 0, 0],
      );
  } else if (type === "fence") {
    for (const x of [-0.53, 0, 0.53]) {
      part(g, "box", "#ede5cb", [x, 0.36, 0], [0.13, 0.73, 0.13]);
      part(
        g,
        "cone",
        "#ede5cb",
        [x, 0.77, 0],
        [0.093, 0.15, 0.093],
        [0, Math.PI / 4, 0],
      );
    }
    for (const y of [0.23, 0.55])
      part(g, "box", "#e2d9bb", [0, y, 0.045], [1.23, 0.1, 0.075]);
  } else if (type === "lantern") {
    part(g, "cylinder", P.dark, [0, 0.52, 0], [0.037, 1.04, 0.037]);
    part(g, "box", P.dark, [0.095, 1.04, 0], [0.25, 0.06, 0.06]);
    part(g, "box", "#ffd388", [0.19, 0.85, 0], [0.17, 0.25, 0.17], [], true);
    part(
      g,
      "cone",
      P.dark,
      [0.19, 1.03, 0],
      [0.16, 0.12, 0.16],
      [0, Math.PI / 4, 0],
    );
    part(g, "box", P.dark, [0.19, 0.705, 0], [0.22, 0.04, 0.22]);
  } else if (type === "mushroom") {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.21,
        z = (i % 2) * 0.2,
        s = i === 1 ? 1 : 0.7;
      part(
        g,
        "cylinder",
        P.cream,
        [x, 0.16 * s, z],
        [0.055 * s, 0.32 * s, 0.055 * s],
      );
      part(g, "ball", P.roof, [x, 0.32 * s, z], [0.2 * s, 0.115 * s, 0.2 * s]);
      for (let j = 0; j < 3; j++)
        part(
          g,
          "ball",
          P.cream,
          [
            x + Math.sin(j * 2) * 0.09 * s,
            0.4 * s,
            z + Math.cos(j * 2) * 0.09 * s,
          ],
          [0.035 * s, 0.014 * s, 0.035 * s],
        );
    }
  } else if (type === "mailbox") {
    part(g, "box", P.wood, [0, 0.36, 0], [0.09, 0.72, 0.09]);
    part(g, "rounded", "#758f80", [0, 0.81, 0], [0.36, 0.29, 0.45]);
    part(g, "box", "#3f6358", [0, 0.8, 0.234], [0.28, 0.19, 0.016]);
    part(g, "box", P.roof, [0.21, 0.96, 0], [0.04, 0.22, 0.06]);
    part(g, "box", P.roof, [0.21, 1.04, 0.055], [0.04, 0.07, 0.15]);
  } else if (type === "well") {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      part(
        g,
        "rounded",
        P.stone,
        [Math.sin(a) * 0.36, 0.25, Math.cos(a) * 0.36],
        [0.22, 0.5, 0.2],
        [0, a, 0],
      );
    }
    part(g, "cylinder", "#385d60", [0, 0.17, 0], [0.33, 0.05, 0.33]);
    for (const x of [-0.45, 0.45])
      part(g, "box", P.wood, [x, 0.7, 0], [0.09, 1.4, 0.1]);
    roof(g, 1.15, 0.9, 1.28);
    part(
      g,
      "cylinder",
      P.wood,
      [0, 0.96, 0],
      [0.07, 0.97, 0.07],
      [0, 0, Math.PI / 2],
    );
  } else if (type === "picnic") {
    part(g, "rounded", "#de9a82", [0, 0.035, 0], [1.2, 0.05, 0.95]);
    for (let i = 0; i < 4; i++)
      part(
        g,
        "box",
        "#edd4b2",
        [(i - 1.5) * 0.29, 0.065, 0],
        [0.08, 0.01, 0.92],
      );
    for (let i = 0; i < 3; i++)
      part(g, "box", "#edd4b2", [0, 0.067, (i - 1) * 0.3], [1.17, 0.01, 0.08]);
    part(g, "rounded", "#b7925b", [-0.3, 0.2, -0.25], [0.36, 0.29, 0.3]);
    part(g, "cylinder", "#eee5ca", [0.28, 0.09, 0.08], [0.17, 0.025, 0.17]);
    part(g, "ball", "#c28363", [0.28, 0.14, 0.08], [0.09, 0.07, 0.08]);
  } else if (type === "cart") {
    part(g, "box", "#b48b59", [0, 0.48, 0], [0.83, 0.23, 0.53]);
    for (const x of [-0.48, 0.48])
      part(
        g,
        "cylinder",
        P.dark,
        [x, 0.27, 0],
        [0.24, 0.08, 0.24],
        [0, 0, Math.PI / 2],
      );
    for (let i = 0; i < 5; i++)
      flower(
        g,
        (i - 2) * 0.14,
        ((i % 2) - 0.5) * 0.2,
        ["#eed399", "#eaa092", "#f0e6c9"][i % 3],
        0.79,
      );
    part(g, "box", P.wood, [0, 0.38, 0.55], [0.05, 0.07, 0.68]);
  }
  return g;
}

// Merge repeated parts by material once per asset. Instances share these templates.
const templates = new Map<AssetId, T.Group>();
export function createModel(type: AssetId): T.Group {
  if (!templates.has(type)) {
    const raw = buildModel(type);
    raw.updateMatrixWorld(true);
    const buckets = new Map<
      T.Material,
      { geometry: T.BufferGeometry; matrix: T.Matrix4 }[]
    >();
    const animated = raw.getObjectByName("blades");
    if (animated) raw.remove(animated);
    raw.traverse((o) => {
      if (o instanceof T.Mesh) {
        const material = o.material as T.Material;
        if (!buckets.has(material)) buckets.set(material, []);
        buckets
          .get(material)!
          .push({ geometry: o.geometry, matrix: o.matrixWorld.clone() });
      }
    });
    const merged = new T.Group();
    buckets.forEach((parts, material) => {
      const prepared = parts.map((p) =>
        (p.geometry.index
          ? p.geometry.toNonIndexed()
          : p.geometry.clone()
        ).applyMatrix4(p.matrix),
      );
      const geometry = mergeGeometries(prepared, false);
      prepared.forEach((g) => g.dispose());
      if (geometry) {
        const mesh = new T.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        merged.add(mesh);
      }
    });
    if (animated) merged.add(animated);
    templates.set(type, merged);
  }
  return templates.get(type)!.clone(true);
}

let thumbs: Record<string, string> | null = null;
export function renderThumbnails(): Record<string, string> {
  if (thumbs) return thumbs;
  const result: Record<string, string> = {};
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(200, 164);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.add(new T.AmbientLight("#fff7df", 2.6));
  const light = new T.DirectionalLight("#fff4dd", 4);
  light.position.set(-3, 5, 4);
  scene.add(light);
  const camera = new T.OrthographicCamera(-1.5, 1.5, 1.23, -1.23, 0.1, 30);
  camera.position.set(4, 3.2, 5);
  camera.lookAt(0, 0.7, 0);
  const ids: AssetId[] = [
    "cottage",
    "cabin",
    "windmill",
    "oak",
    "pine",
    "willow",
    "flowers",
    "bush",
    "rock",
    "stones",
    "grass",
    "stump",
    "bench",
    "fence",
    "lantern",
    "mushroom",
    "mailbox",
    "well",
    "picnic",
    "cart",
  ];
  for (const id of ids) {
    const model = createModel(id);
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    const center = box.getCenter(new T.Vector3());
    const s = 1.8 / Math.max(size.x, size.y, size.z, 1.3);
    model.scale.setScalar(s);
    model.position.set(-center.x * s, 0.7 - center.y * s, -center.z * s);
    scene.add(model);
    renderer.render(scene, camera);
    result[id] = renderer.domElement.toDataURL("image/png");
    scene.remove(model);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  thumbs = result;
  return result;
}
