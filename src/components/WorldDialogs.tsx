import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  FileJson,
  Image,
  LoaderCircle,
  Undo2,
} from "lucide-react";
import { Dialog } from "./Dialog";
import { WorldMark } from "./Icons";
import { createPreset, getAsset, PRESETS } from "../editor/world";
import type { World } from "../editor/world";
import { filename, parseWorldFile } from "../editor/persistence";
import { useEditor } from "../editor/store";
import { sceneActions } from "../scene/WorldScene";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const world = useEditor((s) => s.history.present);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState<World | null>(null);
  const [postcardBlob, setPostcardBlob] = useState<Blob | null>(null);
  const jsonBlob = useMemo(() => new Blob([JSON.stringify(world, null, 2)], {type: 'application/json'}), [world]);
  const jsonUrl = useBlobUrl(jsonBlob);
  const postcardUrl = useBlobUrl(postcardBlob);
  const file = useRef<HTMLInputElement>(null);
  const postcard = async () => {
    setError("");
    setBusy(true);
    try {
      if (!sceneActions.postcard)
        throw new Error(
          "The 3D scene is unavailable. You can still save your world as JSON.",
        );
      setPostcardBlob(await sceneActions.postcard());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog label="Save a little wonder" onClose={onClose}>
      <WorldMark />
      <h2>Keep a little wonder.</h2>
      <p>
        Save your creation to come back to, or send a little piece of your world
        to someone.
      </p>
      <div className="export-choices">
        <button onClick={postcard} disabled={busy}>
          <span className="export-icon">
            <Image size={24} />
          </span>
          <span>
            <strong>
              {busy ? "Making your postcard…" : "Download a postcard"}
              <small>A clean 1800 × 1400 PNG of your island</small>
            </strong>
          </span>
          {busy ? (
            <LoaderCircle size={19} className="spin" />
          ) : (
            <ArrowDownToLine size={19} />
          )}
        </button>
        <a href={jsonUrl ?? undefined} download={filename(world.name, 'json')}>
          <span className="export-icon">
            <FileJson size={24} />
          </span>
          <span>
            <strong>
              Export world file
              <small>Keep every piece. Edit it again later.</small>
            </strong>
          </span>
          <ArrowDownToLine size={19} />
        </a>
      </div>
      {postcardUrl && <div className="postcard-result">
        <img src={postcardUrl} width={1800} height={1400} alt={`Postcard of ${world.name}, without editor controls`} />
        <a className="primary-button" href={postcardUrl} download={filename(world.name, 'png')}><ArrowDownToLine size={17}/> Save PNG postcard</a>
        <p>Your postcard is ready. Save it above, or use your browser’s image menu.</p>
      </div>}
      <div className="import-area">
        <div>
          <h3>Bring a world back</h3>
          <p>Have a Tiny World JSON file?</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => file.current?.click()}
        >
          <ArrowUpFromLine size={16} /> Import world
        </button>
        <input
          ref={file}
          className="visually-hidden"
          tabIndex={-1}
          type="file"
          accept=".json,application/json"
          aria-label="Import world JSON file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setError("");
            try {
              if (f.size > 1024 * 1024)
                throw new Error("Choose a world file smaller than 1 MB.");
              setIncoming(parseWorldFile(await f.text()));
            } catch (err) {
              setIncoming(null);
              setError((err as Error).message);
            }
          }}
        />
      </div>
      {incoming && (
        <div className="import-confirm">
          <h3>Open “{incoming.name}”?</h3>
          <p>
            {incoming.objects.length} pieces · {incoming.lighting}. This
            replaces the current island. Undo will bring it back.
          </p>
          <div>
            <button
              className="secondary-button"
              onClick={() => setIncoming(null)}
            >
              Keep this world
            </button>
            <button
              className="primary-button"
              onClick={() => {
                useEditor.getState().replace(incoming);
                useEditor
                  .getState()
                  .notify(
                    "World imported. Undo brings back your previous island.",
                  );
                onClose();
              }}
            >
              <Check size={16} /> Open world
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p className="local-note">
        Your world is saved on this browser. A world file keeps a copy beyond
        this device.
      </p>
    </Dialog>
  );
}
function useBlobUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
export function PresetDialog({
  onClose,
  thumbs,
}: {
  onClose: () => void;
  thumbs: Record<string, string>;
}) {
  const [choice, setChoice] = useState("meadow");
  return (
    <Dialog label="Start a new world" onClose={onClose}>
      <WorldMark />
      <h2>Somewhere new.</h2>
      <p>Start with a little inspiration, then make it entirely yours.</p>
      <div className="preset-list">
        {PRESETS.map((p, i) => (
          <button
            key={p.id}
            aria-pressed={choice === p.id}
            className={choice === p.id ? "selected" : ""}
            onClick={() => setChoice(p.id)}
          >
            <span
              className="preset-illustration"
              style={{ background: p.tint }}
            >
              <img src={thumbs[["cottage", "cabin", "windmill"][i]]} alt="" />
              <img src={thumbs[i === 1 ? "pine" : "oak"]} alt="" />
            </span>
            <span>
              <strong>{p.name}</strong>
              <small>{p.description}</small>
            </span>
            <span className="radio-mark">
              {choice === p.id && <Check size={14} />}
            </span>
          </button>
        ))}
      </div>
      <p className="preset-notice">
        <Undo2 size={15} /> Your current world can be restored with Undo.
      </p>
      <button
        className="primary-button"
        onClick={() => {
          useEditor.getState().replace(createPreset(choice));
          useEditor.setState((s) => ({ resetCamera: s.resetCamera + 1 }));
          useEditor
            .getState()
            .notify("A fresh start. Your previous world is one Undo away.");
          onClose();
        }}
      >
        Make this world yours
      </button>
    </Dialog>
  );
}
export function PiecesDialog({
  onClose,
  thumbs,
}: {
  onClose: () => void;
  thumbs: Record<string, string>;
}) {
  const objects = useEditor((s) => s.history.present.objects);
  return (
    <Dialog label="Pieces on your island" onClose={onClose}>
      <h2>Your little collection.</h2>
      <p>Choose any piece to move, rotate, duplicate, or remove it.</p>
      <div className="pieces-list">
        {objects.length === 0 ? (
          <p>Your island is a blank canvas. Add a piece from the library.</p>
        ) : (
          objects.map((o, i) => (
            <button
              key={o.id}
              onClick={() => {
                useEditor.getState().select(o.id);
                onClose();
              }}
            >
              <img src={thumbs[o.type]} alt="" />
              <span>
                {getAsset(o.type).name}
                <small>Piece {i + 1}</small>
              </span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
