import { useEffect, useRef, useState } from "react";
import { placementCursor, useEditor } from "./store";
import { readWorld, saveWorld } from "./persistence";
import { canPlace } from "./world";
import type { AssetId } from "./world";

export function placementAction(action: string, x = 0, z = 0) {
  const s = useEditor.getState();
  if (!s.placing && !s.moving) return;
  if (action === 'place') {
    if (s.place(placementCursor.x, placementCursor.z)) window.dispatchEvent(new Event('tiny-place'));
    return;
  }
  placementCursor.x += x;
  placementCursor.z += z;
  window.dispatchEvent(
    new CustomEvent("tiny-placement", { detail: { action, x, z } }),
  );
}
export function usePersistence() {
  const world = useEditor((s) => s.history.present);
  const [status, setStatus] = useState<
    "loading" | "saving" | "saved" | "error"
  >("loading");
  const [hydrated, setHydrated] = useState(false);
  const blocked = useRef(false);
  const start = useRef(world);
  useEffect(() => {
    try {
      const loaded = readWorld(localStorage);
      if (loaded) useEditor.getState().replace(loaded, false);
    } catch {
      blocked.current = true;
      useEditor
        .getState()
        .notify(
          "Browser storage is unavailable or unreadable. Export a JSON file to keep your work.",
        );
      setStatus("error");
    }
    start.current = useEditor.getState().history.present;
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (blocked.current && world === start.current) return;
    setStatus("saving");
    const t = setTimeout(() => {
      try {
        saveWorld(localStorage, world);
        setStatus("saved");
        blocked.current = false;
      } catch {
        setStatus("error");
      }
    }, 650);
    return () => clearTimeout(t);
  }, [world, hydrated]);
  useEffect(() => {
    const flush = () => {
      if (blocked.current) return;
      try {
        saveWorld(localStorage, useEditor.getState().history.present);
      } catch {
        /* Visible status already provides the portable export alternative. */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
  return status;
}
export function useKeyboard() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("input,textarea,select,[contenteditable=true]") ||
        document.querySelector("dialog[open]")
      )
        return;
      const s = useEditor.getState(),
        item = s.history.present.objects.find((o) => o.id === s.selected),
        mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        if (item) {
          e.preventDefault();
          s.duplicate();
        }
        return;
      }
      if (e.key === "Escape") {
        s.choose(null);
        s.select(null);
        return;
      }
      if (e.key.toLowerCase() === "m" && item) {
        s.startMove();
        return;
      }
      if (e.key.toLowerCase() === "r") {
        if (item)
          s.edit({
            rotation: item.rotation + ((e.shiftKey ? -1 : 1) * Math.PI) / 4,
          });
        else if (s.placing)
          useEditor.setState({
            placementRotation:
              s.placementRotation + ((e.shiftKey ? -1 : 1) * Math.PI) / 4,
          });
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && item) {
        e.preventDefault();
        s.remove();
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
        (item || s.placing)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.2,
          x = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          z = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        if (s.placing || s.moving) placementAction("nudge", x, z);
        else if (item) s.edit({ x: item.x + x, z: item.z + z });
        return;
      }
      if (e.key === "Enter" && (s.placing || s.moving)) {
        e.preventDefault();
        placementAction("place");
        return;
      }
      if (e.key === "0") {
        useEditor.setState({ resetCamera: s.resetCamera + 1 });
        return;
      }
      if (e.key === "[" || e.key === "]") {
        const all = s.history.present.objects;
        if (!all.length) return;
        const index = all.findIndex((o) => o.id === s.selected);
        s.select(
          all[(index + (e.key === "]" ? 1 : -1) + all.length) % all.length].id,
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
}
let context: AudioContext | null = null;
let drone: AudioBufferSourceNode | null = null;
let master: GainNode | null = null;
export async function toggleSound() {
  const s = useEditor.getState();
  if (s.sound) {
    useEditor.setState({ sound: false });
    try {
      await context?.suspend();
    } catch {
      /* Already closed. */
    }
    return;
  }
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.035;
      master.connect(context.destination);
      const buffer = context.createBuffer(
          1,
          context.sampleRate * 4,
          context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.022) / 1.022;
        data[i] = last * 3;
      }
      drone = context.createBufferSource();
      drone.buffer = buffer;
      drone.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 450;
      drone.connect(filter);
      filter.connect(master);
      drone.start();
    }
    await context.resume();
    useEditor.setState({ sound: true });
  } catch {
    useEditor
      .getState()
      .notify(
        "Sound isn’t available in this browser. Your world is still ready to build.",
      );
  }
}
export function useSound() {
  useEffect(() => {
    const ping = () => {
      if (
        !useEditor.getState().sound ||
        !context ||
        context.state !== "running"
      )
        return;
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(680, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        390,
        context.currentTime + 0.19,
      );
      gain.gain.setValueAtTime(0.07, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    };
    window.addEventListener("tiny-place", ping);
    return () => window.removeEventListener("tiny-place", ping);
  }, []);
}

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWorldTools() {
  useEffect(() => {
    const ctx = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!ctx?.registerTool) return;
    const controller = new AbortController();
    const register = (tool: Parameters<ModelContext["registerTool"]>[0]) => {
      try {
        void Promise.resolve(
          ctx.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {
        /* Optional browser API. */
      }
    };
    register({
      name: "read_tiny_world",
      title: "Read the current island",
      description:
        "Read the current local world name, objects, and atmosphere.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => useEditor.getState().history.present,
    });
    register({
      name: "add_tiny_world_pieces",
      title: "Place pieces on the island",
      description:
        "Add up to 20 pieces to grassy buildable coordinates. All inputs are checked before placing anything; changes can be undone.",
      inputSchema: {
        type: "object",
        properties: {
          pieces: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                x: { type: "number" },
                z: { type: "number" },
              },
              required: ["type", "x", "z"],
              additionalProperties: false,
            },
          },
        },
        required: ["pieces"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        const values = (input as { pieces?: unknown[] })?.pieces;
        if (!Array.isArray(values) || !values.length || values.length > 20)
          throw new Error("Provide 1–20 pieces.");
        const s = useEditor.getState();
        if (s.history.present.objects.length + values.length > 180)
          throw new Error("The island has room for 180 pieces.");
        const pieces = values.map((raw) => {
          const o = raw as { type: AssetId; x: number; z: number };
          try {
            if (!canPlace(o.type, o.x, o.z)) throw new Error();
          } catch {
            throw new Error("Unknown piece or invalid grassy position.");
          }
          return {
            id: crypto.randomUUID(),
            type: o.type,
            x: o.x,
            z: o.z,
            rotation: 0,
          };
        });
        s.update((w) => ({ ...w, objects: [...w.objects, ...pieces] }));
        return {
          added: pieces.map((p) => p.id),
          count: useEditor.getState().history.present.objects.length,
        };
      },
    });
    return () => controller.abort();
  }, []);
}
