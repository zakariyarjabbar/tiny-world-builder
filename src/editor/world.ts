export const CATALOG = [
  { id: "cottage", name: "Cozy cottage", category: "Buildings", radius: 0.86 },
  { id: "cabin", name: "Woodland cabin", category: "Buildings", radius: 0.8 },
  {
    id: "windmill",
    name: "Little windmill",
    category: "Buildings",
    radius: 0.7,
  },
  { id: "oak", name: "Round oak", category: "Nature", radius: 0.43 },
  { id: "pine", name: "Pine tree", category: "Nature", radius: 0.4 },
  { id: "willow", name: "Willow tree", category: "Nature", radius: 0.55 },
  { id: "flowers", name: "Wildflowers", category: "Nature", radius: 0.28 },
  { id: "bush", name: "Berry bush", category: "Nature", radius: 0.35 },
  { id: "rock", name: "River rocks", category: "Landscape", radius: 0.42 },
  {
    id: "stones",
    name: "Stepping stones",
    category: "Landscape",
    radius: 0.46,
  },
  { id: "grass", name: "Meadow grass", category: "Landscape", radius: 0.25 },
  { id: "stump", name: "Old tree stump", category: "Landscape", radius: 0.3 },
  { id: "bench", name: "Garden bench", category: "Decor", radius: 0.58 },
  { id: "fence", name: "Picket fence", category: "Decor", radius: 0.58 },
  { id: "lantern", name: "Glowing lantern", category: "Decor", radius: 0.2 },
  { id: "mushroom", name: "Mushroom trio", category: "Decor", radius: 0.3 },
  { id: "mailbox", name: "Little mailbox", category: "Decor", radius: 0.22 },
  { id: "well", name: "Wishing well", category: "Decor", radius: 0.53 },
  { id: "picnic", name: "Picnic blanket", category: "Decor", radius: 0.68 },
  { id: "cart", name: "Flower cart", category: "Decor", radius: 0.48 },
] as const;
export type AssetId = (typeof CATALOG)[number]["id"];
export type Lighting = "day" | "sunset" | "night";
export type WorldObject = {
  id: string;
  type: AssetId;
  x: number;
  z: number;
  rotation: number;
};
export type World = {
  version: 1;
  name: string;
  objects: WorldObject[];
  lighting: Lighting;
  rain: boolean;
};
export const MAX_OBJECTS = 180;
export const getAsset = (id: AssetId) => CATALOG.find((a) => a.id === id)!;
export const terrainHeight = (x: number, z: number) =>
  0.44 + 0.09 * Math.sin(x * 0.7) * Math.cos(z * 0.65);
export function islandRadius(angle: number) {
  return 5.25 + 0.27 * Math.sin(angle * 3 + 1) + 0.17 * Math.cos(angle * 5);
}
export function canPlace(type: AssetId, x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const radius = getAsset(type).radius;
  if (Math.hypot(x, z) + radius > islandRadius(Math.atan2(z, x)) - 0.38)
    return false;
  // The pond is protected; objects stay on buildable grass.
  return (
    ((x - 2.05) / (1.35 + radius)) ** 2 + ((z - 1.6) / (0.85 + radius)) ** 2 > 1
  );
}
const obj = (
  type: AssetId,
  x: number,
  z: number,
  rotation = 0,
): WorldObject => ({ id: crypto.randomUUID(), type, x, z, rotation });
export const PRESETS = [
  {
    id: "meadow",
    name: "Meadowbrook",
    description: "A cottage, a pond, a slower pace.",
    tint: "#dce8ca",
  },
  {
    id: "woodland",
    name: "Woodland Hideaway",
    description: "A quiet cabin among the trees.",
    tint: "#ccdacc",
  },
  {
    id: "village",
    name: "Sunflower Village",
    description: "Little homes with big-hearted charm.",
    tint: "#efdfbb",
  },
] as const;
export function createPreset(id = "meadow"): World {
  let objects: WorldObject[];
  if (id === "woodland")
    objects = [
      obj("cabin", -0.8, -0.5),
      obj("oak", -2.8, -1.8),
      obj("willow", 1.5, -1.8),
      obj("pine", -1, -3),
      obj("pine", 0.5, -3.5),
      obj("pine", -3, 1),
      obj("pine", 3, -0.8),
      obj("oak", -1.7, 2.9),
      obj("stump", 0.4, 1.4),
      obj("bench", -0.7, 2.3),
      obj("mushroom", -2.3, 0.4),
      obj("mushroom", 0.4, -2),
      obj("lantern", -1, 1),
      obj("rock", 4, 1.6),
      obj("flowers", -0.5, 3.5),
    ];
  else if (id === "village")
    objects = [
      obj("cottage", -1.8, -1),
      obj("cabin", 1, -1.7),
      obj("windmill", -2, 2),
      obj("oak", -3.3, -0.5),
      obj("pine", 2.8, -2),
      obj("well", -0.1, 0.3),
      obj("cart", -0.4, 2.3),
      obj("fence", -1.2, -2.6),
      obj("fence", 0.1, -3),
      obj("flowers", -2.9, 1),
      obj("flowers", 0.2, 3.6),
      obj("bench", 3.2, -0.3),
      obj("mailbox", -1.3, 0.3),
      obj("lantern", 0.4, -0.4),
      obj("rock", 4, 1.6),
    ];
  else
    objects = [
      obj("cottage", -0.85, -0.65),
      obj("oak", -2.85, -1.4),
      obj("oak", 0.7, -2.8),
      obj("pine", 2.5, -2),
      obj("pine", 3.2, -1.25),
      obj("willow", -2.85, 1.7),
      obj("fence", -1.7, -2.45),
      obj("fence", -0.4, -2.9),
      obj("bench", -0.8, 2.8, 0.12),
      obj("mailbox", 0.3, 0.25),
      obj("flowers", -2, 0.65),
      obj("flowers", -1.8, 2.75),
      obj("flowers", 0.8, 3.5),
      obj("mushroom", -3.5, -0.3),
      obj("rock", 4, 1.45),
      obj("rock", 2.5, 3.25),
      obj("bush", 1.4, -1.2),
      obj("lantern", -0.5, 1.2),
      obj("stones", -0.6, 1),
      obj("stones", -0.05, 1.7, -0.5),
      obj("grass", -3, 2.8),
      obj("grass", 1.1, -3.7),
      obj("bush", -2.7, -2.65),
    ];
  return {
    version: 1,
    name: PRESETS.find((p) => p.id === id)?.name ?? "Meadowbrook",
    objects,
    lighting: "day",
    rain: false,
  };
}
export function validateWorld(value: unknown): World {
  if (!value || typeof value !== "object")
    throw new Error(
      "This file is not a Tiny World. Choose a world JSON export.",
    );
  const w = value as Record<string, unknown>;
  if (w.version !== 1)
    throw new Error(
      "This world uses an unsupported file version. Expected version 1.",
    );
  if (typeof w.name !== "string" || !w.name.trim() || w.name.length > 60)
    throw new Error("World names must contain 1–60 characters.");
  if (
    !["day", "sunset", "night"].includes(w.lighting as string) ||
    typeof w.rain !== "boolean"
  )
    throw new Error("The world atmosphere settings are invalid.");
  if (!Array.isArray(w.objects) || w.objects.length > MAX_OBJECTS)
    throw new Error(`Worlds can contain up to ${MAX_OBJECTS} objects.`);
  const ids = new Set<string>();
  const objects = w.objects.map((raw: unknown) => {
    if (!raw || typeof raw !== "object")
      throw new Error("An object in this file is invalid.");
    const o = raw as WorldObject;
    if (typeof o.id !== "string" || !o.id || o.id.length > 100 || ids.has(o.id))
      throw new Error("Object identifiers must be unique.");
    if (
      !CATALOG.some((a) => a.id === o.type) ||
      !Number.isFinite(o.rotation) ||
      Math.abs(o.rotation) > Math.PI * 100 ||
      !canPlace(o.type, o.x, o.z)
    )
      throw new Error(
        "An object is unknown or outside the buildable island. Your current world is safe.",
      );
    ids.add(o.id);
    return { id: o.id, type: o.type, x: o.x, z: o.z, rotation: o.rotation };
  });
  return {
    version: 1,
    name: w.name.trim(),
    objects,
    lighting: w.lighting as Lighting,
    rain: w.rain,
  };
}
export type History = { past: World[]; present: World; future: World[] };
export function commit(history: History, next: World): History {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return {
    past: [...history.past.slice(-59), history.present],
    present: next,
    future: [],
  };
}
export function undo(history: History): History {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redo(history: History): History {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
