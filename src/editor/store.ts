import { create } from "zustand";
import {
  canPlace,
  commit,
  createPreset,
  MAX_OBJECTS,
  redo,
  undo,
} from "./world";
import type { AssetId, History, World, WorldObject } from "./world";
type Editor = {
  history: History;
  selected: string | null;
  placing: AssetId | null;
  moving: boolean;
  placementRotation: number;
  reducedMotion: boolean;
  sound: boolean;
  toast: string;
  resetCamera: number;
  update: (fn: (w: World) => World) => void;
  replace: (w: World, recoverable?: boolean) => void;
  select: (id: string | null) => void;
  choose: (id: AssetId | null) => void;
  startMove: () => void;
  place: (x: number, z: number) => boolean;
  edit: (patch: Partial<WorldObject>) => boolean;
  duplicate: () => void;
  remove: () => void;
  undo: () => void;
  redo: () => void;
  notify: (s: string) => void;
};
// Transient cursor updates do not rerender the interface. Keyboard placement is
// synchronous even when React Three Fiber has not committed its next frame yet.
export const placementCursor = { x: 0, z: 0 };
export const useEditor = create<Editor>((set, get) => ({
  history: { past: [], present: createPreset(), future: [] },
  selected: null,
  placing: null,
  moving: false,
  placementRotation: 0,
  reducedMotion:
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  sound: false,
  toast: "",
  resetCamera: 0,
  update: (fn) =>
    set((s) => ({ history: commit(s.history, fn(s.history.present)) })),
  replace: (world, recoverable = true) =>
    set((s) => ({
      history: recoverable
        ? commit(s.history, world)
        : { past: [], present: world, future: [] },
      selected: null,
      placing: null,
      moving: false,
    })),
  select: (selected) => set({ selected, placing: null, moving: false }),
  choose: (placing) => {
    placementCursor.x = 0;
    placementCursor.z = 0;
    set({ placing, selected: null, moving: false, placementRotation: 0 });
  },
  startMove: () => {
    const s = get();
    const item = s.history.present.objects.find(o => o.id === s.selected);
    if (!item) return;
    placementCursor.x = item.x;
    placementCursor.z = item.z;
    set({ moving: true });
  },
  place: (x, z) => {
    const s = get();
    const type = s.placing;
    if (s.moving && s.selected) {
      const ok = s.edit({ x, z });
      if (ok) set({ moving: false });
      return ok;
    }
    if (!type || !canPlace(type, x, z)) {
      s.notify("Choose a grassy spot inside the island.");
      return false;
    }
    if (s.history.present.objects.length >= MAX_OBJECTS) {
      s.notify(
        `This little island is full (${MAX_OBJECTS} pieces). Remove a piece to add another.`,
      );
      return false;
    }
    const item = {
      id: crypto.randomUUID(),
      type,
      x,
      z,
      rotation: s.placementRotation,
    };
    s.update((w) => ({ ...w, objects: [...w.objects, item] }));
    set({ selected: item.id, placing: null });
    return true;
  },
  edit: (patch) => {
    const s = get();
    const item = s.history.present.objects.find((o) => o.id === s.selected);
    if (!item) return false;
    const next = { ...item, ...patch, id: item.id, type: item.type };
    if (!canPlace(next.type, next.x, next.z)) {
      s.notify("That spot is beyond the grass or too close to the pond.");
      return false;
    }
    s.update((w) => ({
      ...w,
      objects: w.objects.map((o) => (o.id === item.id ? next : o)),
    }));
    return true;
  },
  duplicate: () => {
    const s = get();
    const item = s.history.present.objects.find((o) => o.id === s.selected);
    if (!item) return;
    if (s.history.present.objects.length >= MAX_OBJECTS) {
      s.notify("The island is full. Remove a piece first.");
      return;
    }
    for (let r = 0.7; r < 8; r += 0.5)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const x = item.x + Math.cos(a) * r,
          z = item.z + Math.sin(a) * r;
        if (canPlace(item.type, x, z)) {
          const copy = { ...item, id: crypto.randomUUID(), x, z };
          s.update((w) => ({ ...w, objects: [...w.objects, copy] }));
          placementCursor.x = x;
          placementCursor.z = z;
          set({ selected: copy.id, moving: true, placing: null });
          s.notify("Copied. Choose a spot, or keep it here.");
          return;
        }
      }
  },
  remove: () => {
    const s = get();
    if (!s.selected) return;
    s.update((w) => ({
      ...w,
      objects: w.objects.filter((o) => o.id !== s.selected),
    }));
    set({ selected: null, moving: false });
  },
  undo: () =>
    set((s) => ({
      history: undo(s.history),
      selected: null,
      placing: null,
      moving: false,
    })),
  redo: () =>
    set((s) => ({
      history: redo(s.history),
      selected: null,
      placing: null,
      moving: false,
    })),
  notify: (toast) => set({ toast }),
}));
