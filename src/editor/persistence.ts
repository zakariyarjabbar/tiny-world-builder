import { validateWorld } from "./world";
import type { World } from "./world";
export const STORAGE_KEY = "tiny-world-builder:world:v1";
export const BACKUP_KEY = "tiny-world-builder:previous:v1";
export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export function readWorld(storage: StorageLike): World | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    return validateWorld(JSON.parse(raw));
  } catch (error) {
    // Retain the original bytes, even if an old browser or external tool broke the file.
    storage.setItem(STORAGE_KEY + ":unreadable", raw);
    const backup = storage.getItem(BACKUP_KEY);
    if (backup) return validateWorld(JSON.parse(backup));
    throw error;
  }
}
export function saveWorld(storage: StorageLike, world: World) {
  const clean = validateWorld(world);
  const previous = storage.getItem(STORAGE_KEY);
  if (previous) {
    try {
      validateWorld(JSON.parse(previous));
      storage.setItem(BACKUP_KEY, previous);
    } catch {
      /* Never replace a valid backup with corrupt content. */
    }
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(clean));
}
export function parseWorldFile(text: string): World {
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error(
      "That file is too large. Choose a world JSON file smaller than 1 MB.",
    );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This file isn’t valid JSON. Choose a Tiny World .json export.",
    );
  }
  return validateWorld(value);
}
export function filename(name: string, extension: string) {
  return `${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "tiny-world"
  }.${extension}`;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  // A native modal makes the rest of the document inert, including download
  // anchors. Keep this activation inside the active top layer when one is open.
  (document.querySelector('dialog[open]') ?? document.body).append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
