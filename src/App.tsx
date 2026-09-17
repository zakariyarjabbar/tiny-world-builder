import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  CloudRain,
  Copy,
  Flower2,
  Home,
  LayoutGrid,
  Leaf,
  List,
  LoaderCircle,
  Maximize,
  Minus,
  Moon,
  MousePointer2,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Settings2,
  SlidersHorizontal,
  Sun,
  Sunset,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { WorldMark } from "./components/Icons";
import { CATALOG, getAsset } from "./editor/world";
import type { Lighting } from "./editor/world";
import { useEditor } from "./editor/store";
import { renderThumbnails } from "./scene/models";
import { sceneActions, WorldScene } from "./scene/WorldScene";
import { Dialog } from "./components/Dialog";
import {
  ExportDialog,
  PiecesDialog,
  PresetDialog,
} from "./components/WorldDialogs";
import {
  placementAction,
  toggleSound,
  useKeyboard,
  usePersistence,
  useSound,
  useWorldTools,
} from "./editor/runtime";
import "./styles.css";
export default function App() {
  const s = useEditor();
  const world = s.history.present;
  const saveStatus = usePersistence();
  useKeyboard();
  useSound();
  useWorldTools();
  const [dialog, setDialog] = useState<"export" | "presets" | "pieces" | null>(
    null,
  );
  const [category, setCategory] = useState("All");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [library, setLibrary] = useState(() => window.innerWidth > 700);
  const [atmosphere, setAtmosphere] = useState(false);
  const [help, setHelp] = useState(false);
  const selected = world.objects.find((o) => o.id === s.selected);
  useEffect(() => {
    if (s.selected) setAtmosphere(false);
  }, [s.selected]);
  const active = s.placing || (s.moving ? selected?.type : null);
  useEffect(() => {
    try {
      setThumbs(renderThumbnails());
    } catch {
      /* The main scene provides a graphics fallback. */
    }
  }, []);
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => useEditor.setState({ toast: "" }), 4200);
    return () => clearTimeout(t);
  }, [s.toast]);
  return (
    <div
      className={`app atmosphere-${world.lighting} ${s.reducedMotion ? "reduce-motion" : ""}`}
    >
      <header className="topbar">
        <a className="brand" href="/" aria-label="Tiny World Builder">
          <WorldMark />
          <span>
            Tiny World<span className="brand-second">Builder</span>
          </span>
        </a>
        <div className="world-title">
          <WorldName />
          <span className="world-dot" />
          <span
            className={`save-status ${saveStatus === "error" ? "save-error" : ""}`}
            role="status"
            title={
              saveStatus === "error"
                ? "Could not save in this browser. Export a world file to keep your work."
                : "Saved locally on this browser"
            }
          >
            {saveStatus === "saved" ? (
              <Check size={14} />
            ) : saveStatus === "error" ? (
              <AlertCircle size={14} />
            ) : (
              <LoaderCircle size={13} className="spin" />
            )}
            {saveStatus === "saved"
              ? "All changes saved"
              : saveStatus === "error"
                ? "Save unavailable · export a copy"
                : saveStatus === "loading"
                  ? "Opening world…"
                  : "Saving…"}
          </span>
        </div>
        <div className="top-actions">
          <button
            className="text-button"
            aria-label="New world"
            onClick={() => setDialog("presets")}
          >
            <LayoutGrid size={17} />
            <span>New world</span>
          </button>
          <button
            className="primary-button"
            aria-label="Export world"
            onClick={() => setDialog("export")}
          >
            <ArrowDownToLine size={17} />
            <span>Export world</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>
      <main className={`workspace ${library ? "library-open" : ""}`}>
        <section
          className={`library panel ${library ? "is-open" : ""}`}
          aria-label="Object library"
        >
          <button
            className="library-mobile-toggle"
            onClick={() => setLibrary(!library)}
          >
            <span>
              <Plus size={18} /> Little things to add
            </span>
            {library ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <div className="library-inner">
            <div className="library-heading">
              <h2>Little things</h2>
              <span>{CATALOG.length} pieces</span>
            </div>
            <p className="library-description">
              A little of this. A little of you.
            </p>
            <div className="category-tabs" aria-label="Object categories">
              {[
                { name: "All", icon: LayoutGrid },
                { name: "Buildings", icon: Home },
                { name: "Nature", icon: Leaf },
                { name: "Landscape", icon: Flower2 },
                { name: "Decor", icon: Sun },
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  aria-pressed={category === name}
                  className={category === name ? "active" : ""}
                  onClick={() => setCategory(name)}
                  title={name}
                >
                  <Icon size={17} />
                  <span>
                    {name === "Buildings"
                      ? "Homes"
                      : name === "Landscape"
                        ? "Land"
                        : name}
                  </span>
                </button>
              ))}
            </div>
            <div className="object-grid">
              {CATALOG.filter(
                (a) => category === "All" || a.category === category,
              ).map((a) => (
                <button
                  className={`object-card ${s.placing === a.id ? "chosen" : ""}`}
                  key={a.id}
                  onClick={() => {
                    s.choose(s.placing === a.id ? null : a.id);
                    if (innerWidth < 700) setLibrary(false);
                  }}
                  aria-pressed={s.placing === a.id}
                  aria-label={`Place ${a.name}`}
                >
                  <span className="object-preview">
                    {thumbs[a.id] && <img src={thumbs[a.id]} alt="" />}
                    <span className="object-add">
                      <Plus size={13} />
                    </span>
                  </span>
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
            <button
              className="library-footnote"
              onClick={() => {
                setDialog("pieces");
                if (innerWidth < 700) setLibrary(false);
              }}
            >
              <List size={15} />
              <span>Your island collection</span>
              <span className="piece-count">{world.objects.length}</span>
            </button>
          </div>
        </section>
        <section className="stage" aria-label="World editor">
          <WorldScene />
          <div className="scene-heading">
            <h1>A world of your own.</h1>
            <p>No rush. Just a little imagination.</p>
          </div>
          <button
            aria-label="Atmosphere settings"
            className="atmosphere-trigger panel"
            onClick={() => setAtmosphere(!atmosphere)}
            aria-expanded={atmosphere}
          >
            <span className="sun-icon">
              {world.lighting === "day" ? (
                <Sun size={19} />
              ) : world.lighting === "sunset" ? (
                <Sunset size={19} />
              ) : (
                <Moon size={19} />
              )}
            </span>
            <span>
              {world.lighting === "day"
                ? "A lovely day"
                : world.lighting === "sunset"
                  ? "Golden hour"
                  : "Under the stars"}
            </span>
            <SlidersHorizontal size={16} />
          </button>
          {atmosphere && (
            <section className="atmosphere-panel panel">
              <div className="panel-heading">
                <h2>Set the mood</h2>
                <button
                  className="icon-button"
                  aria-label="Close atmosphere settings"
                  onClick={() => setAtmosphere(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="lighting-options">
                {(
                  [
                    { id: "day", name: "Day", icon: Sun },
                    { id: "sunset", name: "Sunset", icon: Sunset },
                    { id: "night", name: "Night", icon: Moon },
                  ] as const
                ).map(({ id, name, icon: Icon }) => (
                  <button
                    key={id}
                    className={world.lighting === id ? "active" : ""}
                    aria-pressed={world.lighting === id}
                    onClick={() =>
                      s.update((w) => ({ ...w, lighting: id as Lighting }))
                    }
                  >
                    <Icon size={20} />
                    {name}
                  </button>
                ))}
              </div>
              <button
                className="setting-row"
                role="switch"
                aria-checked={world.rain}
                onClick={() => s.update((w) => ({ ...w, rain: !w.rain }))}
              >
                <span>
                  <CloudRain size={17} /> Gentle rain
                </span>
                <span className={`switch ${world.rain ? "on" : ""}`} />
              </button>
              <button
                className="setting-row"
                role="switch"
                aria-checked={s.reducedMotion}
                onClick={() =>
                  useEditor.setState({ reducedMotion: !s.reducedMotion })
                }
              >
                <span>
                  <Settings2 size={17} /> Reduced motion
                </span>
                <span className={`switch ${s.reducedMotion ? "on" : ""}`} />
              </button>
            </section>
          )}
          {selected && !active && (
            <section className="inspector panel" aria-label="Selected object">
              <div className="panel-heading">
                <div>
                  <span className="muted-label">Make it yours</span>
                  <h2>{getAsset(selected.type).name}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Deselect object"
                  onClick={() => s.select(null)}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="selected-preview">
                {thumbs[selected.type] && (
                  <img src={thumbs[selected.type]} alt="" />
                )}
              </div>
              <button
                className="move-button"
                onClick={s.startMove}
              >
                <Move size={17} /> Move piece <kbd>M</kbd>
              </button>
              <div className="edit-actions">
                <button
                  onClick={() =>
                    s.edit({ rotation: selected.rotation - Math.PI / 4 })
                  }
                  aria-label="Rotate selected left"
                  title="Rotate left"
                >
                  <RotateCcw size={17} />
                  <span>Rotate</span>
                </button>
                <button onClick={s.duplicate}>
                  <Copy size={17} />
                  <span>Duplicate</span>
                </button>
                <button onClick={s.remove} className="delete-button">
                  <Trash2 size={17} />
                  <span>Delete</span>
                </button>
              </div>
              <div className="nudge-control">
                <span>Nudge position</span>
                <div>
                  {[
                    { icon: ArrowLeft, x: -0.2, z: 0, label: "Nudge left" },
                    { icon: ChevronUp, x: 0, z: -0.2, label: "Nudge back" },
                    { icon: ChevronDown, x: 0, z: 0.2, label: "Nudge forward" },
                    { icon: ArrowRight, x: 0.2, z: 0, label: "Nudge right" },
                  ].map(({ icon: Icon, x, z, label }) => (
                    <button
                      key={label}
                      className="icon-button"
                      aria-label={label}
                      onClick={() =>
                        s.edit({ x: selected.x + x, z: selected.z + z })
                      }
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          {active && (
            <div className="placement-hint panel">
              <MousePointer2 size={18} />
              <span>
                {s.moving ? "Move" : "Place"}{" "}
                <strong>{getAsset(active).name.toLowerCase()}</strong>
                <small>Tap grass, or use arrows + Enter</small>
              </span>
              <button
                className="place-confirm"
                onClick={() => placementAction("place")}
              >
                Place here
              </button>
              <button
                className="icon-button"
                aria-label="Rotate placement"
                onClick={() =>
                  s.moving && selected
                    ? s.edit({ rotation: selected.rotation + Math.PI / 4 })
                    : useEditor.setState({
                        placementRotation: s.placementRotation + Math.PI / 4,
                      })
                }
              >
                <RotateCw size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Cancel placement"
                onClick={() => {
                  s.choose(null);
                }}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <div className="scene-bottom">
            <button
              className="world-count"
              aria-label="View pieces on your island"
              onClick={() => setDialog("pieces")}
            >
              <span className="status-dot" />
              {world.objects.length} little pieces, one happy place
            </button>
            <div
              className="camera-toolbar panel"
              aria-label="Camera and editing tools"
            >
              <button
                className="icon-button"
                aria-label="Undo"
                title="Undo · ⌘Z"
                disabled={!s.history.past.length}
                onClick={s.undo}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo"
                title="Redo · ⌘⇧Z"
                disabled={!s.history.future.length}
                onClick={s.redo}
              >
                <Redo2 size={18} />
              </button>
              <span className="tool-divider" />
              <button
                className="icon-button"
                aria-label="Zoom out"
                onClick={() => sceneActions.zoom?.(0.88)}
              >
                <Minus size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Reset camera"
                title="Reset view · 0"
                onClick={() =>
                  useEditor.setState({ resetCamera: s.resetCamera + 1 })
                }
              >
                <Maximize size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Zoom in"
                onClick={() => sceneActions.zoom?.(1.12)}
              >
                <Plus size={18} />
              </button>
              <span className="tool-divider" />
              <button
                className="icon-button"
                aria-label="Orbit camera left"
                onClick={() => sceneActions.orbit?.(-Math.PI / 8)}
              >
                <RotateCcw size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Orbit camera right"
                onClick={() => sceneActions.orbit?.(Math.PI / 8)}
              >
                <RotateCw size={18} />
              </button>
            </div>
            <div className="utility-tools">
              <button
                className={`icon-button panel ${s.sound ? "active" : ""}`}
                aria-label={s.sound ? "Mute sound" : "Enable ambient sound"}
                onClick={toggleSound}
              >
                {s.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                className="icon-button panel"
                aria-label="Help and keyboard shortcuts"
                onClick={() => setHelp(!help)}
              >
                <CircleHelp size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <span>Made for your quiet moments.</span>
        <span>
          <span className="desktop-hint">
            Drag to orbit <i /> Scroll to zoom <i /> Right-drag to pan
          </span>
          <span className="mobile-hint">
            <span>Drag to orbit · Pinch to zoom</span>
            <span role="status" className={saveStatus === 'error' ? 'mobile-save-error' : ''}>
              {saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'error' ? 'Save failed · export a copy' : saveStatus === 'loading' ? 'Opening…' : 'Saving…'}
            </span>
          </span>
        </span>
        <span>
          Just you & your imagination <Leaf size={12} />
        </span>
      </footer>
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "presets" && (
        <PresetDialog thumbs={thumbs} onClose={() => setDialog(null)} />
      )}
      {dialog === "pieces" && (
        <PiecesDialog thumbs={thumbs} onClose={() => setDialog(null)} />
      )}
      {s.toast && (
        <div className="toast" role="status">
          {s.toast}
        </div>
      )}
      {help && (
        <Dialog
          label="help"
          className="help-dialog"
          onClose={() => setHelp(false)}
        >
          <WorldMark />
          <h2>A little guidance.</h2>
          <p>
            Pick a piece from the library, then click a grassy spot to give it a
            home. Click any piece to make it yours.
          </p>
          <div className="shortcut-grid">
            {[
              ["Place preview", "Enter"],
              ["Choose next / previous piece", "] / ["],
              ["Move selected piece", "M"],
              ["Rotate selected or preview", "R"],
              ["Duplicate selected", "⌘ / Ctrl D"],
              ["Delete selected", "Delete"],
              ["Undo / Redo", "⌘ Z / ⌘ ⇧ Z"],
              ["Nudge selected", "Arrow keys"],
              ["Cancel / deselect", "Esc"],
              ["Reset camera", "0"],
            ].map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
          <p className="help-note">
            Drag to look around. Scroll to zoom. Right-drag to pan. On touch
            screens, use two fingers to zoom and pan.
          </p>
          <button className="primary-button" onClick={() => setHelp(false)}>
            Let’s make something lovely
          </button>
        </Dialog>
      )}
    </div>
  );
}

function WorldName() {
  const name = useEditor((s) => s.history.present.name);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const finish = () => {
    const clean = draft.trim() || name;
    setDraft(clean);
    if (clean !== name)
      useEditor.getState().update((w) => ({ ...w, name: clean }));
  };
  return (
    <input
      aria-label="World name"
      maxLength={60}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(name);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
