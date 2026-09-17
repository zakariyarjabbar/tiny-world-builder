# Verification record

Completed on 17 September 2026. Further testing was stopped at the user's request.

## Completed

- `npm run build`: TypeScript check and Vite production build passed. Output is in `dist/`.
- `npm test`: 18 focused tests passed. Coverage includes every preset, terrain boundaries and pond protection, malformed/versioned imports, object limits and identifiers, history branching and bounds, save/restore/backup, storage failures, the complete editor action sequence, and immediate keyboard-placement regression behavior.
- Dependency installation reported zero known vulnerabilities after updating Vitest to 4.1.11.
- Real in-app browser checks: add pieces, nudge, move, rotate, duplicate, delete, undo and redo; naming; day/sunset/night selection; rain, reduced motion, and sound enable/mute controls.
- Refresh restored the world exactly: name, object identifiers and transforms, lighting, and rain.
- A downloaded version-1 JSON world re-imported successfully. Undo restored the exact preceding world. An invalid version produced a visible error without changing the current world.
- PNG generation produced a loaded 1800 × 1400 image. A downloaded PNG was inspected and contained the island without interface overlays. The export dialog now retains a visible postcard preview and direct download link.
- Desktop and 390 × 844 mobile layouts were inspected. The mobile library was corrected to resize the scene above the sheet; its corrected layout was confirmed. The small-screen export action and save status have explicit accessible labels/text.
- An 84-object scene reported 60 FPS in the browser's rolling sample, with 413 draw calls and 256,676 triangles. Orbit, zoom and reset worked in that scene. This is one measurement on the current machine, not a device-wide performance guarantee. All population-test pieces were removed using Undo.
- Optional WebMCP tools registered and worked: reading world state and atomically adding validated batches. A mixed valid/invalid batch left the world unchanged.
- No new warning/error log entries were found during the final populated-scene check. Earlier development-only geometry-merge errors were fixed by normalizing geometry indexing before merging.

## Remaining limits

- No physical-device multitouch test, cross-browser matrix, screen-reader audit, or sustained low-end-device performance benchmark was performed.
- Graphics-context loss and unavailable WebGL have implemented fallbacks; forced failure testing was not performed in the browser.
- Storage-denial/quota behavior was covered in unit tests, not by changing browser security settings.
- In-app browser download-event reporting timed out during earlier checks; generated output, actual exported files, and successful JSON re-import were verified separately.
- Audio control state was verified; the synthesized sound was not independently assessed by listening.
- The final desktop visual reconfirmation and remaining preset-button checks were stopped when the user asked to perform testing themselves. All three presets pass schema and buildable-position tests.

The development preview remains available at `http://localhost:5173/`. This application has not been published to a remote host.
