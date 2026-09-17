import { describe, expect, it, vi } from "vitest";
import {
  canPlace,
  CATALOG,
  commit,
  createPreset,
  MAX_OBJECTS,
  PRESETS,
  redo,
  undo,
  validateWorld,
} from "./world";
import type { History } from "./world";
import {
  BACKUP_KEY,
  parseWorldFile,
  readWorld,
  saveWorld,
  STORAGE_KEY,
} from "./persistence";
import { useEditor } from "./store";
import { placementAction } from "./runtime";

describe("terrain and world validation", () => {
  it.each(PRESETS.map((p) => p.id))(
    "validates every piece in the %s preset",
    (id) => {
      const world = createPreset(id);
      expect(validateWorld(world)).toEqual(world);
      expect(world.objects.every((o) => canPlace(o.type, o.x, o.z))).toBe(true);
    },
  );
  it("has at least fifteen distinct buildable assets", () => {
    expect(new Set(CATALOG.map((a) => a.id)).size).toBeGreaterThanOrEqual(15);
  });
  it("protects water, island edges, and nonfinite coordinates", () => {
    expect(canPlace("cottage", 2.05, 1.6)).toBe(false);
    expect(canPlace("oak", 6, 0)).toBe(false);
    expect(canPlace("oak", NaN, 0)).toBe(false);
    expect(canPlace("oak", 0, Infinity)).toBe(false);
    expect(canPlace("oak", 0, 0)).toBe(true);
  });
  it("rejects unknown versions, objects, duplicate identifiers, and bad positions", () => {
    const w = createPreset();
    expect(() => validateWorld({ ...w, version: 2 })).toThrow(/version/);
    expect(() =>
      validateWorld({
        ...w,
        objects: [{ ...w.objects[0], type: "spaceship" }],
      }),
    ).toThrow(/unknown/);
    expect(() =>
      validateWorld({ ...w, objects: [w.objects[0], w.objects[0]] }),
    ).toThrow(/unique/);
    expect(() =>
      validateWorld({ ...w, objects: [{ ...w.objects[0], x: 100 }] }),
    ).toThrow(/outside/);
    expect(() =>
      validateWorld({ ...w, objects: [{ ...w.objects[0], rotation: NaN }] }),
    ).toThrow();
  });
  it("bounds file size, object count, names, and atmosphere", () => {
    const w = createPreset();
    expect(() => parseWorldFile("{broken")).toThrow(/JSON/);
    expect(() => parseWorldFile(" ".repeat(1024 * 1024 + 1))).toThrow(/large/);
    expect(() => validateWorld({ ...w, name: " " })).toThrow(/names/);
    expect(() => validateWorld({ ...w, lighting: "noon" })).toThrow(
      /atmosphere/,
    );
    expect(() =>
      validateWorld({
        ...w,
        objects: Array(MAX_OBJECTS + 1).fill(w.objects[0]),
      }),
    ).toThrow(/180/);
  });
  it("strips unrecognized input properties and roundtrips a versioned file", () => {
    const w = createPreset();
    expect(parseWorldFile(JSON.stringify({ ...w, secret: "ignored" }))).toEqual(
      w,
    );
  });
});
describe("transactional history", () => {
  it("undoes and redoes edits and replacement worlds exactly", () => {
    const first = createPreset(),
      next = createPreset("woodland");
    const h: History = { past: [], present: first, future: [] };
    const changed = commit(h, next);
    expect(undo(changed).present).toEqual(first);
    expect(redo(undo(changed)).present).toEqual(next);
  });
  it("clears redo after a new edit without recording no-ops", () => {
    const w = createPreset();
    let h: History = { past: [], present: w, future: [] };
    expect(commit(h, { ...w })).toBe(h);
    h = commit(h, { ...w, name: "Two" });
    h = undo(h);
    h = commit(h, { ...w, name: "Three" });
    expect(h.future).toHaveLength(0);
    expect(redo(h)).toBe(h);
  });
  it("keeps a bounded sixty-step history", () => {
    let h: History = { past: [], present: createPreset(), future: [] };
    for (let i = 0; i < 100; i++)
      h = commit(h, { ...h.present, name: `World ${i}` });
    expect(h.past).toHaveLength(60);
  });
});
describe("local persistence", () => {
  const storage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  };
  it("saves, restores, and retains the previous valid world", () => {
    const st = storage(),
      w = createPreset();
    expect(readWorld(st)).toBeNull();
    saveWorld(st, w);
    expect(readWorld(st)).toEqual(w);
    saveWorld(st, { ...w, name: "Renamed" });
    expect(JSON.parse(st.getItem(BACKUP_KEY)!)).toEqual(w);
  });
  it("recovers from a corrupt current entry without destroying the original bytes", () => {
    const st = storage(),
      w = createPreset();
    st.setItem(BACKUP_KEY, JSON.stringify(w));
    st.setItem(STORAGE_KEY, "broken");
    expect(readWorld(st)).toEqual(w);
    expect(st.getItem(STORAGE_KEY + ":unreadable")).toBe("broken");
  });
  it("surfaces denied storage and quota errors without claiming a save", () => {
    const fail = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveWorld(fail, createPreset())).toThrow(/Quota/);
    expect(() =>
      readWorld({
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {},
      }),
    ).toThrow(/Security/);
  });
  it("does not mutate a valid world after invalid import", () => {
    const w = createPreset();
    useEditor.getState().replace(w, false);
    try {
      parseWorldFile("{invalid");
    } catch {
      /* UI shows this error. */
    }
    expect(useEditor.getState().history.present).toEqual(w);
  });
});
describe("editor journey", () => {
  it('handles immediate keyboard moves and placement without waiting for a render', () => {
    vi.stubGlobal('window', new EventTarget());
    try {
      const s = useEditor.getState();
      s.replace({ ...createPreset(), objects: [] }, false);
      s.choose('flowers');
      placementAction('nudge', .2, 0);
      placementAction('nudge', 0, .2);
      placementAction('place');
      expect(useEditor.getState().history.present.objects[0]).toMatchObject({ x: .2, z: .2 });
      s.startMove();
      placementAction('nudge', -.2, 0);
      placementAction('nudge', 0, .2);
      placementAction('place');
      expect(useEditor.getState().history.present.objects[0]).toMatchObject({ x: 0, z: .4 });
      expect(useEditor.getState().moving).toBe(false);
      s.duplicate();
      placementAction('place');
      expect(useEditor.getState().history.present.objects).toHaveLength(2);
      expect(useEditor.getState().moving).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
  it("places, moves, rotates, duplicates, deletes, undoes and redoes", () => {
    const s = useEditor.getState();
    s.replace({ ...createPreset(), objects: [] }, false);
    s.choose("oak");
    expect(s.place(0, 0)).toBe(true);
    let state = useEditor.getState();
    const id = state.selected;
    expect(state.history.present.objects).toHaveLength(1);
    expect(state.edit({ x: -1, z: 1, rotation: Math.PI / 2 })).toBe(true);
    expect(state.edit({ x: 100 })).toBe(false);
    expect(useEditor.getState().history.present.objects[0]).toMatchObject({
      x: -1,
      z: 1,
      rotation: Math.PI / 2,
    });
    state.duplicate();
    state = useEditor.getState();
    expect(state.history.present.objects).toHaveLength(2);
    expect(state.selected).not.toBe(id);
    state.remove();
    expect(useEditor.getState().history.present.objects).toHaveLength(1);
    state.undo();
    expect(useEditor.getState().history.present.objects).toHaveLength(2);
    state.redo();
    expect(useEditor.getState().history.present.objects).toHaveLength(1);
  });
  it("refuses invalid placement without changing history", () => {
    const s = useEditor.getState();
    s.replace(createPreset(), false);
    s.choose("cottage");
    expect(s.place(2.05, 1.6)).toBe(false);
    expect(useEditor.getState().history.past).toHaveLength(0);
  });
});
