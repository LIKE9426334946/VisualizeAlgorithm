import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LocateFixed, Box } from "lucide-react";
import { evaluate } from "../engine/objectives";
import { algorithmById } from "../engine/algorithms";
import { norm, type Vec2 } from "../engine/math";
import { animatedPoint, type PlotProps } from "./ContourPlot";
import { fmt } from "./Formula";
export default function SurfacePlot({
  objective,
  runs,
  clock,
  field,
  dark,
  onStart,
}: PlotProps) {
  const host = useRef<HTMLDivElement>(null),
    resetCamera = useRef<() => void>(() => {}),
    onStartRef = useRef(onStart);
  const [error, setError] = useState(""),
    [hover, setHover] = useState<{
      p: Vec2;
      value: number;
      gradient: number;
    } | null>(null);
  onStartRef.current = onStart;
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError("此浏览器暂不支持 WebGL。请使用上方的等高线或热力图继续学习。");
      return;
    }
    setError("");
    setHover(null);
    el.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
    scene.background = new THREE.Color(dark ? "#151c29" : "#fbfcff");
    camera.position.set(12, 10, 13);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 4;
    controls.maxDistance = 65;
    controls.target.set(0, 1.7, 0);
    resetCamera.current = () => {
      camera.position.set(12, 10, 13);
      controls.target.set(0, 1.7, 0);
      controls.update();
    };
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(4, 12, 8);
    scene.add(light);
    const [xmin, xmax, ymin, ymax] = objective.domain,
      n = 96,
      values: number[] = [];
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++)
        values.push(
          objective.value([
            xmin + (i / n) * (xmax - xmin),
            ymin + (j / n) * (ymax - ymin),
          ]),
        );
    const zmin = Math.min(...values),
      zmax = Math.max(...values),
      zscale = 5 / Math.max(zmax - zmin, 1e-8);
    const toWorld = (p: Vec2, lift = 0) =>
      new THREE.Vector3(
        ((p[0] - (xmin + xmax) / 2) * 10) / (xmax - xmin),
        (objective.value(p) - zmin) * zscale + lift,
        (-(p[1] - (ymin + ymax) / 2) * 10) / (ymax - ymin),
      );
    const positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const p: Vec2 = [
            xmin + (i / n) * (xmax - xmin),
            ymin + (j / n) * (ymax - ymin),
          ],
          w = toWorld(p),
          t = (values[j * (n + 1) + i] - zmin) / Math.max(zmax - zmin, 1e-8);
        positions.push(w.x, w.y, w.z);
        const color = new THREE.Color().setHSL(
          0.61 - 0.16 * t,
          dark ? 0.48 : 0.4,
          dark ? 0.27 + 0.27 * t : 0.85 - 0.34 * t,
        );
        colors.push(color.r, color.g, color.b);
        if (i < n && j < n) {
          const a = j * (n + 1) + i,
            b = a + 1,
            c = a + n + 1,
            d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.02,
      }),
    );
    scene.add(mesh);
    const wire = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: dark ? "#b2d4ff" : "#385987",
        wireframe: true,
        transparent: true,
        opacity: dark ? 0.07 : 0.1,
      }),
    );
    wire.position.y = 0.005;
    scene.add(wire);
    const grid = new THREE.GridHelper(
      10,
      10,
      dark ? "#465471" : "#b6c5dc",
      dark ? "#273650" : "#e0e7f2",
    );
    grid.position.y = -0.045;
    scene.add(grid);
    const labels: THREE.Sprite[] = [];
    const label = (
      text: string,
      position: THREE.Vector3,
      color = dark ? "#adbbd0" : "#61738e",
    ) => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 64;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.font = "28px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, 128, 42);
      const texture = new THREE.CanvasTexture(c),
        sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
          }),
        );
      sprite.position.copy(position);
      sprite.scale.set(2.6, 0.65, 1);
      scene.add(sprite);
      labels.push(sprite);
    };
    label("x", new THREE.Vector3(5.9, -0.1, 5.7));
    label("y", new THREE.Vector3(-5.6, -0.1, -5.7));
    label("f(x,y)", new THREE.Vector3(-5.5, 5.6, 5.5));
    for (let i = 0; i <= 4; i++) {
      label(
        fmt(xmin + (i / 4) * (xmax - xmin), 1),
        new THREE.Vector3(-5 + i * 2.5, -0.3, 5.6),
      );
      label(
        fmt(ymin + (i / 4) * (ymax - ymin), 1),
        new THREE.Vector3(-5.7, -0.3, 5 - i * 2.5),
      );
      label(
        fmt(zmin + (i / 4) * (zmax - zmin), 1),
        new THREE.Vector3(-5.6, i * 1.25, 5.5),
      );
    }
    objective.minima.forEach((p) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.115, 0.022, 8, 24),
        new THREE.MeshBasicMaterial({ color: "#3caf8a" }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(toWorld(p, 0.045));
      scene.add(ring);
    });
    if (field)
      for (let j = 1; j < 12; j++)
        for (let i = 1; i < 12; i++) {
          const p: Vec2 = [
              xmin + (i / 12) * (xmax - xmin),
              ymin + (j / 12) * (ymax - ymin),
            ],
            g = evaluate(objective, p).gradient;
          if (!Number.isFinite(norm(g)) || norm(g) < 1e-8) continue;
          const v = new THREE.Vector3(
            (g[0] * 10) / (xmax - xmin),
            norm(g) ** 2 * zscale,
            (-g[1] * 10) / (ymax - ymin),
          ).normalize();
          const arrow = new THREE.ArrowHelper(
            v,
            toWorld(p, 0.04),
            0.32,
            dark ? 0x91aaca : 0x7792b5,
            0.08,
            0.045,
          );
          scene.add(arrow);
        }
    const trajectories = runs.map((run) => {
      const a = algorithmById(run.algorithm),
        buffer = new Float32Array((run.history.length + 1) * 3);
      run.history.forEach((s, i) =>
        toWorld(s.point, 0.055).toArray(buffer, i * 3),
      );
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(buffer, 3));
      g.setDrawRange(0, 1);
      const line = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({ color: a.color, depthTest: false }),
      );
      line.frustumCulled = false;
      line.renderOrder = 5;
      scene.add(line);
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 20, 14),
        new THREE.MeshStandardMaterial({
          color: a.color,
          emissive: a.color,
          emissiveIntensity: 1,
        }),
      );
      ball.renderOrder = 6;
      scene.add(ball);
      return { run, g, buffer, ball };
    });
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down: { x: number; y: number } | null = null,
      lastHover = 0;
    const hit = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const h = raycaster.intersectObject(mesh)[0];
      return h
        ? ([
            (h.point.x * (xmax - xmin)) / 10 + (xmin + xmax) / 2,
            (-h.point.z * (ymax - ymin)) / 10 + (ymin + ymax) / 2,
          ] as Vec2)
        : null;
    };
    const pointerDown = (e: PointerEvent) => {
      if (e.button === 0) down = { x: e.clientX, y: e.clientY };
    };
    const pointerUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) {
        const p = hit(e);
        if (p) onStartRef.current(p);
      }
      down = null;
    };
    const pointerMove = (e: PointerEvent) => {
      if (down || performance.now() - lastHover < 70) return;
      lastHover = performance.now();
      const p = hit(e);
      setHover(
        p
          ? {
              p,
              value: objective.value(p),
              gradient: norm(evaluate(objective, p).gradient),
            }
          : null,
      );
    };
    const pointerLeave = () => {
      setHover(null);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerleave", pointerLeave);
    let disposed = false,
      raf = 0,
      lastPosition = -1,
      needsRender = true;
    const resize = new ResizeObserver(() => {
      const width = el.clientWidth,
        height = el.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      needsRender = true;
    });
    resize.observe(el);
    const loop = () => {
      if (disposed) return;
      const moved = controls.update(),
        pos = clock.current.position;
      if (pos !== lastPosition) {
        trajectories.forEach(({ run, g, buffer, ball }) => {
          const index = Math.min(Math.floor(pos), run.history.length - 1),
            p = animatedPoint(run, pos);
          toWorld(run.history[index].point, 0.055).toArray(buffer, index * 3);
          toWorld(p, 0.055).toArray(buffer, (index + 1) * 3);
          g.attributes.position.needsUpdate = true;
          g.setDrawRange(0, index + 2);
          ball.position.copy(toWorld(p, 0.13));
        });
        needsRender = true;
        lastPosition = pos;
      }
      if (moved || needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerleave", pointerLeave);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) geometries.add(m.geometry);
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((v) =>
            materials.add(v),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        const map = (m as THREE.SpriteMaterial).map;
        if (map) map.dispose();
        m.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [objective, runs, clock, field, dark]);
  return (
    <div className="plot-canvas surface-wrap">
      <div className="surface-host" ref={host} />
      {error ? (
        <div className="surface-error">
          <Box size={28} />
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="surface-caption">z = f(x, y) · 线性高度轴</div>
          <div className="plot-tools">
            <button
              aria-label="重置三维视角"
              title="重置三维视角"
              onClick={() => resetCamera.current()}
            >
              <LocateFixed size={16} />
            </button>
          </div>
          {hover && (
            <div className="surface-readout">
              ({fmt(hover.p[0], 2)}, {fmt(hover.p[1], 2)})
              <span>
                f = {fmt(hover.value)}　‖∇f‖ = {fmt(hover.gradient)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
