# Tiny World Builder

A local-first miniature island editor built with React, TypeScript, Three.js, React Three Fiber, and Vite. It opens directly into an editable world; no account, backend, API keys, or paid services are required.

## Run locally

Use Node.js 22.12+ (Node 24 LTS is also suitable).

```sh
npm ci
npm run dev -- --port 5173
```

Open `http://localhost:5173`. To verify and serve the production output:

```sh
npm test
npm run build
npm run preview
```

## What is included

- Three composed starter islands and 20 procedural objects across homes, nature, landscape, and decorations.
- Orbit, pan, zoom, and reset; preview placement with pond and island-edge constraints; select, move, rotate, duplicate, delete, and nudge pieces.
- A 60-step undo/redo history, including world names, atmosphere changes, imports, and preset replacements.
- Day, sunset, and night with illuminated windows; animated water, clouds, vegetation, windmills, and optional rain. Ambient audio starts only when enabled. Reduced motion follows the operating-system preference by default and can be changed in atmosphere settings.
- Browser autosave with explicit status, a previous-save backup, validated version-1 JSON import/export, and clean 1800 × 1400 PNG postcards with a visible preview and download link.
- Responsive mobile library sheet and inspector, native dialogs with focus containment, labeled controls, keyboard editing, and an accessible list of all island pieces.
- WebGL/context error fallback, storage failure feedback, model geometry/material reuse, and an automatic pixel-density reduction on slow frames.

## Controls

| Action | Pointer / touch | Keyboard |
| --- | --- | --- |
| Orbit | Drag on the island; toolbar rotation buttons | Tab to camera controls |
| Zoom | Scroll; pinch; +/− toolbar buttons | Tab to +/− |
| Pan | Right-drag; two-finger pan | Camera controls remain available |
| Add | Select a library piece, then tap grass | Select a library piece, arrow keys, Enter |
| Select | Click a piece or use Your island collection | `[` / `]` cycle pieces; collection buttons |
| Move | Inspector Move, then choose a new spot | `M`, arrow keys, Enter |
| Rotate | Inspector or preview rotate button | `R`; Shift+R reverses direction |
| Nudge | Inspector direction buttons | Arrow keys; Shift for larger steps |
| Duplicate | Inspector Duplicate, then place | Cmd/Ctrl+D |
| Delete | Inspector Delete | Delete / Backspace |
| Undo / redo | Toolbar arrows | Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z; Ctrl+Y |
| Cancel | Deselect / Cancel buttons | Escape |
| Reset camera | Frame icon in toolbar | `0` |

Placement and camera gestures are separated: orbit and pan pause while placing or moving. Objects may intentionally overlap for creative compositions, but cannot be placed beyond the buildable terrain or in the pond. The island holds up to 180 pieces.

## Save and export

Autosave stores the current world under `tiny-world-builder:world:v1` after a short debounce and flushes on page exit. The previous valid save is retained under `tiny-world-builder:previous:v1`. Corrupt saved bytes are preserved before recovery. Clearing site data removes browser saves; export a JSON file for a portable copy.

The world schema is `{ version: 1, name, objects, lighting, rain }`. Imports validate size (1 MB maximum), version, name, atmosphere, object identifiers and types, numeric transforms, count, and buildable coordinates before replacing anything. Import and preset replacement are undoable during the current session. History and sound activation are not persisted across refreshes.

Export world file downloads editable JSON. Download a postcard generates a clean preview; Save PNG postcard saves it. Browsers that restrict downloads can use the image menu on the preview.

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/editor/world.ts` | Types, catalog, terrain constraints, presets, schema validation, pure history operations |
| `src/editor/store.ts` | Zustand editor actions and transient placement cursor |
| `src/editor/persistence.ts` | File parsing, storage, backup and filenames |
| `src/editor/runtime.ts` | Autosave lifecycle, shortcuts, audio, optional WebMCP registration |
| `src/scene/models.ts` | Procedural models, merged reusable geometry/materials, library thumbnails |
| `src/scene/WorldScene.tsx` | Terrain, atmosphere, camera, selection and placement rendering, postcard capture |
| `src/components/` | Dialogs, preset chooser, file import/export, piece list and brand mark |
| `src/App.tsx`, `src/styles.css` | Responsive editor shell and tools |
| `src/editor/world.test.ts` | Editor, geometry constraints, import, persistence and history regression tests |

Animation updates Three.js objects directly. It does not update the React interface every frame. Geometry is merged by material and cached per model. Device pixel ratio is capped at 1.6 and drops to 1 after a sustained sample below 30 FPS. The app exposes measured frame rate and render counts as canvas data attributes for local diagnostics.

## Assets and licenses

All 3D models, terrain, thumbnail renders, sound synthesis, and the island SVG mark were created procedurally in this project. No downloaded 3D models, stock art, external image services, or audio files are used.

- DM Sans and Fraunces are bundled locally through Fontsource; their packages include the SIL Open Font License.
- Lucide icons use the ISC license; their package contains its license text.
- Three.js, React, React Three Fiber, Drei, Zustand, and Vite include their open-source licenses in their packages.

## Deploy

Run `npm ci && npm run build`, then serve the `dist/` directory using any HTTPS static hosting service. All routes live at `/`; no server or environment variables are needed. For deployment under a subdirectory, set Vite's `base` option to that path before building. Serve JavaScript with the correct MIME type and long-lived caching for hashed assets; avoid caching `index.html` indefinitely. No deployment was required to use the local preview.

## Limits and verification

See `VERIFICATION.md` for checks performed and remaining browser/device limitations. A WebGL2-capable browser is required for 3D rendering. Local saves belong to a single browser origin and do not synchronize between devices. Mobile viewport checks do not substitute for physical-device multitouch testing.
