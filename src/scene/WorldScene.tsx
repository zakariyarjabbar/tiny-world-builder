import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import * as T from "three";
import { createModel, updateGlow } from "./models";
import {
  canPlace,
  getAsset,
  islandRadius,
  terrainHeight,
} from "../editor/world";
import type { AssetId, WorldObject } from "../editor/world";
import { placementCursor, useEditor } from "../editor/store";

export const sceneActions: {
  postcard: (() => Promise<Blob>) | null;
  zoom: ((factor: number) => void) | null;
  orbit: ((delta: number) => void) | null;
} = { postcard: null, zoom: null, orbit: null };
function makeTerrain() {
  const group = new T.Group();
  const N = 64;
  const rings = [
    { s: 1, y: 0, c: "#91ad61" },
    { s: 1.025, y: -0.2, c: "#d5c28c" },
    { s: 1.005, y: -0.42, c: "#c6aa78" },
    { s: 0.97, y: -0.95, c: "#ab8b62" },
    { s: 0.83, y: -1.85, c: "#a39072" },
    { s: 0.52, y: -2.65, c: "#8b8070" },
    { s: 0.15, y: -2.93, c: "#8a8275" },
  ];
  const vertices: number[] = [],
    colors: number[] = [];
  function point(i: number, ring: number) {
    const a = (i / N) * Math.PI * 2;
    const r = islandRadius(a) * rings[ring].s;
    return new T.Vector3(
      Math.cos(a) * r,
      terrainHeight(Math.cos(a) * r, Math.sin(a) * r) +
        rings[ring].y +
        (ring > 1 ? Math.sin(i * 5.7) * 0.09 : 0),
      Math.sin(a) * r,
    );
  }
  function tri(a: T.Vector3, b: T.Vector3, c: T.Vector3, color: T.Color) {
    for (const v of [a, b, c]) {
      vertices.push(v.x, v.y, v.z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++)
    for (let i = 0; i < N; i++) {
      const shade = 0.93 + (Math.sin(i * 73 + ring * 4) + 1) * 0.055;
      const col = new T.Color(rings[ring + 1].c).multiplyScalar(shade);
      tri(point(i, ring), point(i + 1, ring), point(i, ring + 1), col);
      tri(point(i + 1, ring), point(i + 1, ring + 1), point(i, ring + 1), col);
    }
  // Radial tessellation follows the same height function used for all placed objects.
  for (let r = 0; r < 8; r++)
    for (let i = 0; i < N; i++) {
      const p = (ix: number, rr: number) => {
        const a = (ix / N) * Math.PI * 2,
          rad = (islandRadius(a) * rr) / 8,
          x = Math.cos(a) * rad,
          z = Math.sin(a) * rad;
        return new T.Vector3(x, terrainHeight(x, z), z);
      };
      const col = new T.Color("#94b365").multiplyScalar(
        0.96 + (Math.sin(i * 31 + r * 17) + 1) * 0.025,
      );
      tri(p(i, r), p(i, r + 1), p(i + 1, r + 1), col);
      if (r) tri(p(i, r), p(i + 1, r + 1), p(i + 1, r), col);
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      side: T.DoubleSide,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const sand = new T.Mesh(
    new T.CircleGeometry(1, 64),
    new T.MeshStandardMaterial({ color: "#d8c695", roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.scale.set(1.61, 1.04, 1);
  sand.position.set(2.05, 0.548, 1.6);
  sand.receiveShadow = true;
  group.add(sand);
  // A little dock is part of the terrain, with space to build around it.
  const dock = new T.Group();
  for (let i = 0; i < 6; i++) {
    const plank = new T.Mesh(
      new T.BoxGeometry(0.71, 0.07, 0.145),
      new T.MeshStandardMaterial({
        color: i % 2 ? "#bf9c69" : "#c7a773",
        roughness: 1,
      }),
    );
    plank.position.set(1.47, 0.61, 0.67 + i * 0.16);
    plank.receiveShadow = true;
    plank.castShadow = true;
    dock.add(plank);
  }
  for (const x of [1.12, 1.83])
    for (const z of [0.65, 1.45]) {
      const post = new T.Mesh(
        new T.CylinderGeometry(0.045, 0.05, 0.34, 8),
        new T.MeshStandardMaterial({ color: "#a77e51" }),
      );
      post.position.set(x, 0.68, z);
      post.castShadow = true;
      dock.add(post);
    }
  group.add(dock);
  // Small grass clumps make the edge feel hand arranged.
  for (let i = 0; i < 38; i++) {
    const a = i * 2.399,
      rad = 3.7 + (i % 5) * 0.13,
      x = Math.cos(a) * rad,
      z = Math.sin(a) * rad;
    if (canPlace("grass", x, z)) {
      const tuft = createModel("grass");
      tuft.position.set(x, terrainHeight(x, z), z);
      tuft.scale.setScalar(0.6 + (i % 3) * 0.12);
      group.add(tuft);
    }
  }
  return group;
}
function Pond() {
  const mesh = useRef<T.Mesh>(null);
  const motion = useEditor((s) => !s.reducedMotion);
  const geo = useMemo(() => new T.CircleGeometry(1, 48, 0, Math.PI * 2), []);
  useFrame(({ clock }) => {
    if (mesh.current && motion) {
      const attr = geo.attributes.position;
      for (let i = 1; i < attr.count; i++)
        attr.setZ(i, Math.sin(clock.elapsedTime * 1.3 + i * 0.7) * 0.004);
      attr.needsUpdate = true;
    }
  });
  return (
    <group>
      <mesh
        ref={mesh}
        geometry={geo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.05, 0.564, 1.6]}
        scale={[1.43, 0.88, 1]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#69b9af"
          roughness={0.3}
          metalness={0.06}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0.2]}
          position={[2.35 - i * 0.2, 0.577, 1.75 - i * 0.27]}
          scale={[0.55 - i * 0.08, 0.22, 1]}
        >
          <torusGeometry args={[0.7, 0.012, 3, 40, Math.PI * 1.3]} />
          <meshBasicMaterial color="#aedbc9" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.63, 0.59, 1.9]}>
        <circleGeometry args={[0.16, 12, 0.2, Math.PI * 1.8]} />
        <meshStandardMaterial color="#6e9e64" />
      </mesh>
      <mesh position={[2.62, 0.63, 1.9]} scale={[0.065, 0.035, 0.065]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#f2d8c0" />
      </mesh>
    </group>
  );
}
function Clouds() {
  const ref = useRef<T.Group>(null);
  const reduced = useEditor((s) => s.reducedMotion);
  useFrame(({ clock }) => {
    if (ref.current && !reduced)
      ref.current.position.x = Math.sin(clock.elapsedTime * 0.055) * 0.55;
  });
  return (
    <group ref={ref}>
      {[
        [-7, 1.7, -2],
        [5.8, 2.5, -5.5],
        [-4, 2.5, -7],
        [7, -0.3, 3.8],
        [-6, -0.4, 5.6],
      ].map((p, i) => (
        <group
          key={i}
          position={p as [number, number, number]}
          scale={i % 2 ? 0.9 : 1.1}
        >
          {[-1, 0, 1].map((x, j) => (
            <mesh
              key={j}
              position={[x * 0.5, j === 1 ? 0.17 : 0, 0]}
              scale={[0.68, j === 1 ? 0.4 : 0.3, 0.45]}
            >
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial
                color="#fffdf3"
                transparent
                opacity={0.78}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
function Rain() {
  const ref = useRef<T.Points>(null);
  const reduced = useEditor((s) => s.reducedMotion);
  const positions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 450 * 3 }, (_, i) =>
          i % 3 === 1 ? Math.random() * 9 : (Math.random() - 0.5) * 15,
        ),
      ),
    [],
  );
  useFrame((_, dt) => {
    if (!ref.current || reduced) return;
    const attr = ref.current.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const y = attr.getY(i) - dt * 6;
      attr.setY(i, y < -0.5 ? 8 : y);
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b7d0cc" size={0.045} transparent opacity={0.62} />
    </points>
  );
}
function PlacedModel({ item }: { item: WorldObject }) {
  const model = useMemo(() => createModel(item.type), [item.type]);
  const group = useRef<T.Group>(null);
  const born = useRef<number | null>(null);
  const selected = useEditor((s) => s.selected === item.id);
  const active = useEditor((s) => !!s.placing || s.moving);
  const moving = useEditor((s) => s.moving && s.selected === item.id);
  const reduced = useEditor((s) => s.reducedMotion);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (born.current === null) born.current = clock.elapsedTime;
    const t = clock.elapsedTime - born.current;
    const bounce =
      reduced || t > 1 ? 1 : 1 + Math.sin(t * 15) * 0.12 * Math.exp(-t * 5);
    group.current.scale.set(
      1 / Math.sqrt(bounce),
      bounce,
      1 / Math.sqrt(bounce),
    );
    if (["oak", "willow", "pine", "flowers", "grass"].includes(item.type))
      group.current.rotation.z = reduced
        ? 0
        : Math.sin(clock.elapsedTime * 0.8 + item.x) * 0.012;
    const blades = model.getObjectByName("blades");
    if (blades && !reduced) blades.rotation.z += delta * 0.22;
  });
  if (moving) return null;
  return (
    <group
      position={[item.x, terrainHeight(item.x, item.z), item.z]}
      rotation={[0, item.rotation, 0]}
    >
      <group
        ref={group}
        onClick={(e) => {
          if (active || e.delta > 5) return;
          e.stopPropagation();
          useEditor.getState().select(item.id);
        }}
        onPointerOver={(e) => {
          if (!active) {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <primitive object={model} dispose={null} />
      </group>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.027, 0]}>
          <ringGeometry
            args={[
              getAsset(item.type).radius + 0.1,
              getAsset(item.type).radius + 0.15,
              48,
            ]}
          />
          <meshBasicMaterial
            color="#f9f4cb"
            depthWrite={false}
            side={T.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
function Ghost({
  type,
  position,
  valid,
  rotation,
}: {
  type: AssetId;
  position: [number, number];
  valid: boolean;
  rotation: number;
}) {
  const model = useMemo(() => {
    const m = createModel(type);
    m.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.material = (o.material as T.MeshStandardMaterial).clone();
        o.material.transparent = true;
        o.material.opacity = 0.57;
        o.material.depthWrite = false;
      }
    });
    return m;
  }, [type]);
  useEffect(
    () => () => {
      model.traverse((o) => {
        if (o instanceof T.Mesh) (o.material as T.Material).dispose();
      });
    },
    [model],
  );
  return (
    <group
      position={[position[0], terrainHeight(...position) + 0.03, position[1]]}
      rotation={[0, rotation, 0]}
    >
      <primitive object={model} dispose={null} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry
          args={[
            getAsset(type).radius + 0.08,
            getAsset(type).radius + 0.14,
            40,
          ]}
        />
        <meshBasicMaterial
          color={valid ? "#f7f1be" : "#b4513f"}
          side={T.DoubleSide}
        />
      </mesh>
      {!valid && (
        <group position={[0, 0.1, 0]}>
          {[-1, 1].map((x) => (
            <mesh key={x} rotation={[-Math.PI / 2, 0, (x * Math.PI) / 4]}>
              <planeGeometry args={[0.5, 0.08]} />
              <meshBasicMaterial color="#a54332" side={T.DoubleSide} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
function SceneContent({ onContextError }: { onContextError: () => void }) {
  const world = useEditor((s) => s.history.present);
  const placing = useEditor((s) => s.placing);
  const moving = useEditor((s) => s.moving);
  const selected = useEditor((s) => s.selected);
  const reset = useEditor((s) => s.resetCamera);
  const reduced = useEditor((s) => s.reducedMotion);
  const rotation = useEditor((s) => s.placementRotation);
  const item = world.objects.find((o) => o.id === selected);
  const active = placing || (moving ? item?.type : null);
  const terrain = useMemo(makeTerrain, []);
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  const controls = useRef<OrbitImpl>(null);
  const directional = useRef<T.DirectionalLight>(null);
  const ambient = useRef<T.HemisphereLight>(null);
  const { camera, gl, scene, size, setDpr } = useThree();
  useEffect(() => {
    setHover([placementCursor.x, placementCursor.z]);
  }, [placing, moving, selected]);
  useEffect(() => {
    const action = () => {
      setHover([placementCursor.x, placementCursor.z]);
    };
    window.addEventListener("tiny-placement", action);
    return () => window.removeEventListener("tiny-placement", action);
  }, []);
  const performanceSample = useRef({ time: 0, frames: 0, adjusted: false });
  const targetColor = useMemo(() => new T.Color(), []);
  const fade = useRef(0);
  const reveal = useRef(0);
  const interaction = useRef(false);
  useEffect(() => {
    const lose = (e: Event) => {
      e.preventDefault();
      onContextError();
    };
    gl.domElement.addEventListener("webglcontextlost", lose);
    return () => gl.domElement.removeEventListener("webglcontextlost", lose);
  }, [gl, onContextError]);
  useEffect(() => {
    const cam = camera as T.OrthographicCamera;
    cam.zoom = Math.min(size.width / 14.8, size.height / 12.2);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  useEffect(() => {
    camera.position.set(10, 9, 13);
    const cam = camera as T.OrthographicCamera;
    const currentSize = gl.getSize(new T.Vector2());
    cam.zoom = Math.min(currentSize.x / 14.8, currentSize.y / 12.2);
    cam.updateProjectionMatrix();
    controls.current?.target.set(0, 0.05, 0);
    controls.current?.update();
    interaction.current = false;
    reveal.current = reduced ? 2 : 0;
  }, [reset, camera, gl]);
  useEffect(() => {
    sceneActions.zoom = (f) => {
      const c = camera as T.OrthographicCamera;
      c.zoom = T.MathUtils.clamp(c.zoom * f, 25, 115);
      c.updateProjectionMatrix();
    };
    sceneActions.orbit = (delta) => {
      if (!controls.current) return;
      const offset = camera.position.clone().sub(controls.current.target);
      offset.applyAxisAngle(new T.Vector3(0, 1, 0), delta);
      camera.position.copy(controls.current.target).add(offset);
      controls.current.update();
    };
    sceneActions.postcard = async () => {
      const current = gl.getSize(new T.Vector2()),
        ratio = gl.getPixelRatio();
      const c = camera as T.OrthographicCamera;
      const old = {
        left: c.left,
        right: c.right,
        top: c.top,
        bottom: c.bottom,
        zoom: c.zoom,
      };
      const editorBefore = useEditor.getState();
      const restoreSelection = {selected: editorBefore.selected, placing: editorBefore.placing, moving: editorBefore.moving};
      useEditor.setState({ selected: null, placing: null, moving: false });
      try {
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        gl.setPixelRatio(1);
        gl.setSize(1800, 1400, false);
        c.left = -900;
        c.right = 900;
        c.top = 700;
        c.bottom = -700;
        c.zoom = Math.min(1800 / 14.8, 1400 / 12.2);
        c.updateProjectionMatrix();
        gl.render(scene, c);
        return await new Promise<Blob>((resolve, reject) =>
          gl.domElement.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(
                    new Error("Your browser could not create a postcard."),
                  ),
            "image/png",
          ),
        );
      } finally {
        gl.setPixelRatio(ratio);
        gl.setSize(current.x, current.y, false);
        Object.assign(c, old);
        c.updateProjectionMatrix();
        useEditor.setState(restoreSelection);
      }
    };
    return () => {
      sceneActions.postcard = null;
      sceneActions.zoom = null;
      sceneActions.orbit = null;
    };
  }, [camera, gl, scene]);
  useFrame((_, dt) => {
    const sample = performanceSample.current;
    if (!document.hidden) {
      sample.time += dt;
      sample.frames++;
      if (sample.frames >= 120) {
        const fps = sample.frames / sample.time;
        gl.domElement.dataset.fps = String(Math.round(fps));
        gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
        gl.domElement.dataset.triangles = String(gl.info.render.triangles);
        if (fps < 30 && !sample.adjusted) {
          setDpr(1);
          sample.adjusted = true;
        }
        sample.time = 0;
        sample.frames = 0;
      }
    }
    const speed = reduced ? 1 : 1 - Math.exp(-dt * 2);
    targetColor.set(
      world.lighting === "day"
        ? "#f0f1e7"
        : world.lighting === "sunset"
          ? "#e9cfb5"
          : "#283c47",
    );
    if (!(scene.background instanceof T.Color))
      scene.background = new T.Color("#f0f1e7");
    (scene.background as T.Color).lerp(targetColor, speed);
    if (directional.current) {
      directional.current.color.lerp(
        new T.Color(
          world.lighting === "day"
            ? "#fff1d2"
            : world.lighting === "sunset"
              ? "#ffc08a"
              : "#a4bfd9",
        ),
        speed,
      );
      directional.current.intensity = T.MathUtils.lerp(
        directional.current.intensity,
        world.lighting === "day"
          ? 3.3
          : world.lighting === "sunset"
            ? 2.8
            : 0.65,
        speed,
      );
    }
    if (ambient.current)
      ambient.current.intensity = T.MathUtils.lerp(
        ambient.current.intensity,
        world.lighting === "night" ? 0.8 : 2,
        speed,
      );
    fade.current = T.MathUtils.lerp(
      fade.current,
      world.lighting === "day" ? 0.06 : world.lighting === "sunset" ? 0.9 : 2.1,
      speed,
    );
    updateGlow(fade.current);
    if (!reduced && !interaction.current && reveal.current < 2) {
      reveal.current += dt;
      const offset = camera.position.clone().sub(new T.Vector3(0, 0.05, 0));
      offset.applyAxisAngle(
        new T.Vector3(0, 1, 0),
        dt * 0.08 * (1 - reveal.current / 2),
      );
      camera.position.copy(offset).add(new T.Vector3(0, 0.05, 0));
      controls.current?.update();
    }
  });
  return (
    <>
      <hemisphereLight ref={ambient} args={["#fff9e5", "#a1ac83", 2]} />
      <directionalLight
        ref={directional}
        position={[-5, 10, 6]}
        intensity={3.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
      <primitive object={terrain} dispose={null} />
      <Pond />
      {world.objects.map((o) => (
        <PlacedModel key={o.id} item={o} />
      ))}
      <Clouds />
      {world.rain && <Rain />}
      <ContactShadows
        position={[0, -3.2, 0]}
        opacity={0.23}
        scale={24}
        blur={3.2}
        far={9}
        resolution={256}
        frames={1}
        color="#60714c"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.45, 0]}
        onPointerMove={(e) => {
          if (active) {
            placementCursor.x = e.point.x;
            placementCursor.z = e.point.z;
            setHover([e.point.x, e.point.z]);
          }
        }}
        onClick={(e) => {
          if (e.delta > 5) return;
          e.stopPropagation();
          if (active) {
            if (useEditor.getState().place(e.point.x, e.point.z))
              window.dispatchEvent(new Event("tiny-place"));
          } else useEditor.getState().select(null);
        }}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active && (
        <Ghost
          type={active}
          position={hover}
          valid={canPlace(active, ...hover)}
          rotation={moving ? (item?.rotation ?? 0) : rotation}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reduced}
        dampingFactor={0.09}
        minZoom={25}
        maxZoom={115}
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI * 0.44}
        enableRotate={!active}
        enablePan={!active}
        onChange={() => {
          const ctl = controls.current;
          if (ctl) {
            const before = ctl.target.clone();
            ctl.target.x = T.MathUtils.clamp(ctl.target.x, -2.8, 2.8);
            ctl.target.y = T.MathUtils.clamp(ctl.target.y, -1, 2);
            ctl.target.z = T.MathUtils.clamp(ctl.target.z, -2.8, 2.8);
            camera.position.add(ctl.target.clone().sub(before));
          }
        }}
        target={[0, 0.05, 0]}
        onStart={() => {
          interaction.current = true;
        }}
      />
    </>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
export function WorldScene() {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const fallback = (
    <div className="scene-error" role="alert">
      <h2>Your world is safe.</h2>
      <p>
        The 3D view couldn’t start. Try reloading or enabling graphics
        acceleration in your browser. You can still export your world from the
        top bar.
      </p>
      <button className="primary-button" onClick={() => location.reload()}>
        Reload the scene
      </button>
    </div>
  );
  return (
    <div
      className="canvas-wrap"
      aria-label="Interactive island. Drag to orbit, scroll to zoom. Select a piece from the library to place it."
    >
      {!ready && !failed && (
        <div className="scene-loading">Growing your little world…</div>
      )}
      {failed ? (
        fallback
      ) : (
        <SceneBoundary fallback={fallback}>
          <Canvas
            orthographic
            camera={{ position: [10, 9, 13], zoom: 48, near: 0.1, far: 150 }}
            shadows
            dpr={[1, 1.6]}
            gl={{
              antialias: true,
              preserveDrawingBuffer: true,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = T.SRGBColorSpace;
              gl.toneMapping = T.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              setReady(true);
            }}
            aria-label="3D island"
            fallback={
              <span>Open your island collection for keyboard editing.</span>
            }
          >
            <SceneContent onContextError={() => setFailed(true)} />
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}
