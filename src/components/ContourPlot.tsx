import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  contours,
  geoPath,
  geoIdentity,
  scaleLinear,
  ticks,
  interpolateRgbBasis,
} from "d3";
import { LocateFixed, Minus, Plus } from "lucide-react";
import {
  algorithmById,
  type AlgorithmId,
  type Run,
} from "../engine/algorithms";
import { evaluate, type Objective } from "../engine/objectives";
import { norm, type Vec2 } from "../engine/math";
import type { Clock } from "../hooks/usePlayback";
import { fmt } from "./Formula";
export interface PlotProps {
  objective: Objective;
  runs: Run[];
  clock: RefObject<Clock>;
  tick: number;
  field: boolean;
  dark: boolean;
  selected: AlgorithmId;
  onStart: (p: Vec2) => void;
}
export function animatedPoint(run: Run, position: number): Vec2 {
  const index = Math.min(Math.floor(position), run.history.length - 1),
    current = run.history[index].point,
    next = run.history[index + 1]?.point ?? current;
  const raw = Math.max(0, Math.min(1, ((position % 1) - 0.58) / 0.42)),
    t = raw * raw * (3 - 2 * raw);
  return [
    current[0] + (next[0] - current[0]) * t,
    current[1] + (next[1] - current[1]) * t,
  ];
}
const paletteLight = interpolateRgbBasis([
  "#fafcff",
  "#edf3fd",
  "#c5d5f6",
  "#90a8e9",
  "#687cc9",
  "#4a549d",
]);
const paletteDark = interpolateRgbBasis([
  "#192335",
  "#202e49",
  "#2c4270",
  "#3a5992",
  "#5275b6",
  "#7998d8",
]);
export default function ContourPlot(
  props: PlotProps & { mode: "contour" | "heatmap" },
) {
  const { objective, runs, clock, tick, field, dark, selected, onStart, mode } =
    props;
  const host = useRef<HTMLDivElement>(null),
    base = useRef<HTMLCanvasElement>(null),
    overlay = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 600, height: 480 }),
    [domain, setDomain] = useState(objective.domain),
    [hover, setHover] = useState<{ p: Vec2; px: number; py: number } | null>(
      null,
    );
  const drag = useRef<{
    x: number;
    y: number;
    domain: typeof domain;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    setDomain(objective.domain);
    setHover(null);
  }, [objective]);
  useEffect(() => {
    const el = host.current!;
    const observer = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const bounds = useMemo(() => {
    const pad = { l: 46, r: 24, t: 22, b: 40 },
      width = Math.max(1, size.width - pad.l - pad.r),
      height = Math.max(1, size.height - pad.t - pad.b);
    const unit = Math.min(
      width / (domain[1] - domain[0]),
      height / (domain[3] - domain[2]),
    );
    const cx = (domain[0] + domain[1]) / 2,
      cy = (domain[2] + domain[3]) / 2;
    return {
      pad,
      width,
      height,
      x: scaleLinear()
        .domain([cx - width / unit / 2, cx + width / unit / 2])
        .range([pad.l, size.width - pad.r]),
      y: scaleLinear()
        .domain([cy - height / unit / 2, cy + height / unit / 2])
        .range([size.height - pad.b, pad.t]),
    };
  }, [size, domain]);
  useEffect(() => {
    const canvas = base.current!,
      ctx = canvas.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.scale(dpr, dpr);
    const { x, y, pad, width, height } = bounds;
    ctx.fillStyle = dark ? "#151c29" : "#fff";
    ctx.fillRect(0, 0, size.width, size.height);
    const n = 128,
      values: number[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        values.push(
          objective.value([
            x.invert(pad.l + ((i + 0.5) / n) * width),
            y.invert(pad.t + ((j + 0.5) / n) * height),
          ]),
        );
    const min = Math.min(...values),
      max = Math.max(...values),
      range = Math.max(max - min, 1e-12);
    const transformed = values.map(
      (v) => Math.log1p((16 * (v - min)) / range) / Math.log(17),
    );
    const color = dark ? paletteDark : paletteLight;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, width, height);
    ctx.clip();
    if (mode === "heatmap") {
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = color(transformed[j * n + i]);
          ctx.fillRect(
            pad.l + (i * width) / n,
            pad.t + (j * height) / n,
            width / n + 1,
            height / n + 1,
          );
        }
    } else {
      ctx.fillStyle = color(0);
      ctx.fillRect(pad.l, pad.t, width, height);
      const cs = contours()
        .size([n, n])
        .thresholds(Array.from({ length: 18 }, (_, i) => (i + 1) / 19))(
        transformed,
      );
      ctx.save();
      ctx.translate(pad.l, pad.t);
      ctx.scale(width / n, height / n);
      const path = geoPath(geoIdentity(), ctx);
      for (const c of cs) {
        ctx.beginPath();
        path(c);
        ctx.fillStyle = color(c.value * 0.67);
        ctx.fill();
        ctx.strokeStyle = dark
          ? "rgba(127,156,211,.36)"
          : "rgba(103,134,198,.40)";
        ctx.lineWidth = (0.65 * n) / width;
        ctx.stroke();
      }
      ctx.restore();
      // Label representative isolines with original function values.
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      cs.filter((_, i) => i % 4 === 1).forEach((c) => {
        const ring = c.coordinates[0]?.[0];
        if (!ring || ring.length < 12) return;
        const candidate = ring.find(
          (pt) =>
            pt[0] > n * 0.18 &&
            pt[0] < n * 0.8 &&
            pt[1] > n * 0.06 &&
            pt[1] < n * 0.82,
        );
        if (!candidate) return;
        const px = pad.l + (candidate[0] * width) / n,
          py = pad.t + (candidate[1] * height) / n,
          label = fmt(
            min + (Math.expm1(c.value * Math.log(17)) * range) / 16,
            1,
          );
        ctx.fillStyle = dark ? "#22314b" : "#edf2fc";
        ctx.fillRect(
          px - ctx.measureText(label).width / 2 - 4,
          py - 8,
          ctx.measureText(label).width + 8,
          14,
        );
        ctx.fillStyle = dark ? "#a7bbde" : "#677caa";
        ctx.fillText(label, px, py + 3);
      });
    }
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = dark ? "#92a6c31b" : "#5678a519";
    for (const v of ticks(...(x.domain() as [number, number]), 8)) {
      ctx.beginPath();
      ctx.moveTo(x(v), pad.t);
      ctx.lineTo(x(v), size.height - pad.b);
      ctx.stroke();
    }
    for (const v of ticks(...(y.domain() as [number, number]), 8)) {
      ctx.beginPath();
      ctx.moveTo(pad.l, y(v));
      ctx.lineTo(size.width - pad.r, y(v));
      ctx.stroke();
    }
    ctx.strokeStyle = dark ? "#8796b058" : "#63728c45";
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(x(0), pad.t);
    ctx.lineTo(x(0), size.height - pad.b);
    ctx.moveTo(pad.l, y(0));
    ctx.lineTo(size.width - pad.r, y(0));
    ctx.stroke();
    ctx.setLineDash([]);
    if (field) {
      for (let py = pad.t + 23; py < pad.t + height; py += 35)
        for (let px = pad.l + 23; px < pad.l + width; px += 35) {
          const g = evaluate(objective, [x.invert(px), y.invert(py)]).gradient;
          const length = norm(g);
          if (!Number.isFinite(length) || length < 1e-10) continue;
          const len = 8 + 5 * Math.min(1, Math.log1p(length) / 5);
          arrow(
            ctx,
            px - ((g[0] / length) * len) / 2,
            py + ((g[1] / length) * len) / 2,
            (g[0] / length) * len,
            (-g[1] / length) * len,
            dark ? "#8da3c267" : "#5b73a063",
            1,
          );
        }
    }
    objective.minima.forEach((p) => {
      ctx.beginPath();
      ctx.arc(x(p[0]), y(p[1]), 6, 0, Math.PI * 2);
      ctx.fillStyle = dark ? "#151c29" : "#fff";
      ctx.fill();
      ctx.strokeStyle = "#39a685";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x(p[0]), y(p[1]), 2, 0, Math.PI * 2);
      ctx.fillStyle = "#39a685";
      ctx.fill();
    });
    if (objective.id === "saddle") {
      ctx.strokeStyle = "#db985b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x(0) - 4, y(0) - 4);
      ctx.lineTo(x(0) + 4, y(0) + 4);
      ctx.moveTo(x(0) + 4, y(0) - 4);
      ctx.lineTo(x(0) - 4, y(0) + 4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillStyle = dark ? "#8290a5" : "#8390a2";
    ctx.textAlign = "center";
    for (const v of ticks(...(x.domain() as [number, number]), 8))
      ctx.fillText(fmt(v, 1), x(v), size.height - 17);
    ctx.textAlign = "right";
    for (const v of ticks(...(y.domain() as [number, number]), 8))
      ctx.fillText(fmt(v, 1), pad.l - 13, y(v) + 4);
    ctx.fillStyle = dark ? "#b3bed0" : "#536077";
    ctx.fillText("x", size.width - 10, size.height - 17);
    ctx.fillText("y", pad.l - 13, 16);
  }, [objective, bounds, size, field, dark, mode]);
  useEffect(() => {
    const canvas = overlay.current!,
      ctx = canvas.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.scale(dpr, dpr);
    const { x, y, pad, width, height } = bounds;
    let raf = 0;
    function draw() {
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, width, height);
      ctx.clip();
      runs.forEach((run) => {
        const a = algorithmById(run.algorithm),
          index = Math.min(
            Math.floor(clock.current.position),
            run.history.length - 1,
          ),
          sample = run.history[index],
          pos = animatedPoint(run, clock.current.position);
        const start = run.history[0].point;
        ctx.beginPath();
        ctx.arc(x(start[0]), y(start[1]), 4, 0, 2 * Math.PI);
        ctx.fillStyle = dark ? "#bac6d8" : "#818c9e";
        ctx.fill();
        ctx.beginPath();
        run.history
          .slice(0, index + 1)
          .forEach((s, i) =>
            i === 0
              ? ctx.moveTo(x(s.point[0]), y(s.point[1]))
              : ctx.lineTo(x(s.point[0]), y(s.point[1])),
          );
        ctx.lineTo(x(pos[0]), y(pos[1]));
        ctx.strokeStyle = a.color;
        ctx.lineWidth = run.algorithm === selected ? 2.8 : 2.1;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        if (index < 40)
          run.history.slice(1, index + 1).forEach((s) => {
            ctx.beginPath();
            ctx.arc(x(s.point[0]), y(s.point[1]), 2, 0, 2 * Math.PI);
            ctx.fillStyle = a.color;
            ctx.fill();
          });
        const progress = clock.current.position % 1;
        if (
          run.algorithm === selected &&
          run.history[index + 1] &&
          progress < 0.6
        ) {
          const next = run.history[index + 1],
            g = next.usedGradient,
            length = norm(g);
          if (Number.isFinite(length) && length > 1e-9) {
            const len = Math.min(60, 25 + 10 * Math.log1p(length));
            arrow(
              ctx,
              x(next.evaluationPoint[0]),
              y(next.evaluationPoint[1]),
              (g[0] / length) * len,
              (-g[1] / length) * len,
              "#8c72c6",
              2,
            );
          }
          const d = next.direction,
            dl = norm(d);
          if (dl > 1e-9 && progress >= 0.17)
            arrow(
              ctx,
              x(sample.point[0]),
              y(sample.point[1]),
              (d[0] / dl) * 48,
              (-d[1] / dl) * 48,
              a.color,
              2.5,
            );
        }
        const px = x(pos[0]),
          py = y(pos[1]);
        ctx.shadowColor = a.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = a.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = dark ? "#d7e2fc" : "white";
        ctx.stroke();
      });
      ctx.restore();
      if (clock.current.playing) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [runs, clock, tick, bounds, size, dark, selected]);
  const zoom = useCallback(
    (factor: number, anchor?: Vec2) =>
      setDomain((d) => {
        const mid: Vec2 = anchor ?? [(d[0] + d[1]) / 2, (d[2] + d[3]) / 2];
        if ((d[1] - d[0]) * factor < 0.01 || (d[1] - d[0]) * factor > 1000)
          return d;
        return [
          mid[0] + (d[0] - mid[0]) * factor,
          mid[0] + (d[1] - mid[0]) * factor,
          mid[1] + (d[2] - mid[1]) * factor,
          mid[1] + (d[3] - mid[1]) * factor,
        ];
      }),
    [],
  );
  useEffect(() => {
    const el = host.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(Math.exp(Math.max(-0.3, Math.min(0.3, e.deltaY * 0.001))), [
        bounds.x.invert(e.clientX - rect.left),
        bounds.y.invert(e.clientY - rect.top),
      ]);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom, bounds]);
  const hoverEval = hover ? evaluate(objective, hover.p) : null;
  const outside = runs.some((r) => {
    const p = animatedPoint(r, clock.current.position);
    return (
      bounds.x(p[0]) < bounds.pad.l ||
      bounds.x(p[0]) > size.width - bounds.pad.r ||
      bounds.y(p[1]) < bounds.pad.t ||
      bounds.y(p[1]) > size.height - bounds.pad.b
    );
  });
  return (
    <div
      className="plot-canvas"
      ref={host}
      role="img"
      aria-label={`${objective.name} 函数${mode === "contour" ? "等高线" : "热力图"}。点击设置起点，拖动平移，滚轮缩放。`}
      onPointerDown={(e) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button"))
          return;
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          domain: [...domain],
          moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect(),
          px = e.clientX - rect.left,
          py = e.clientY - rect.top;
        if (drag.current) {
          const d = drag.current,
            dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) > 4) d.moved = true;
          if (d.moved) {
            const ux = bounds.x.invert(1) - bounds.x.invert(0),
              uy = bounds.y.invert(1) - bounds.y.invert(0);
            setDomain([
              d.domain[0] - dx * ux,
              d.domain[1] - dx * ux,
              d.domain[2] - dy * uy,
              d.domain[3] - dy * uy,
            ]);
            setHover(null);
          }
          return;
        }
        if (
          px > bounds.pad.l &&
          px < size.width - bounds.pad.r &&
          py > bounds.pad.t &&
          py < size.height - bounds.pad.b
        )
          setHover({ p: [bounds.x.invert(px), bounds.y.invert(py)], px, py });
        else setHover(null);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!d.moved) {
          const rect = e.currentTarget.getBoundingClientRect(),
            px = e.clientX - rect.left,
            py = e.clientY - rect.top;
          if (
            px >= bounds.pad.l &&
            px <= size.width - bounds.pad.r &&
            py >= bounds.pad.t &&
            py <= size.height - bounds.pad.b
          )
            onStart([bounds.x.invert(px), bounds.y.invert(py)]);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onPointerLeave={() => setHover(null)}
    >
      <canvas ref={base} />
      <canvas ref={overlay} />
      <div className="plot-tools">
        <button aria-label="放大" title="放大" onClick={() => zoom(0.8)}>
          <Plus size={16} />
        </button>
        <button aria-label="缩小" title="缩小" onClick={() => zoom(1.25)}>
          <Minus size={16} />
        </button>
        <button
          aria-label="重置视角"
          title="重置视角"
          onClick={() => setDomain(objective.domain)}
        >
          <LocateFixed size={16} />
        </button>
      </div>
      {hover && hoverEval && !drag.current && (
        <div
          className="hover-readout"
          style={{
            left: Math.max(8, Math.min(hover.px + 15, size.width - 215)),
            top: Math.max(8, Math.min(hover.py + 15, size.height - 96)),
          }}
        >
          <b>
            ({fmt(hover.p[0], 3)}, {fmt(hover.p[1], 3)})
          </b>
          <span>
            f(x, y) <strong>{fmt(hoverEval.value)}</strong>
          </span>
          <span>
            ‖∇f‖ <strong>{fmt(norm(hoverEval.gradient))}</strong>
          </span>
        </div>
      )}
      {outside && (
        <div className="plot-warning">轨迹超出当前视野，可缩小查看</div>
      )}
    </div>
  );
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width: number,
) {
  const angle = Math.atan2(dy, dx),
    head = width > 1 ? 6 : 3.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(
    x + dx - head * Math.cos(angle - 0.5),
    y + dy - head * Math.sin(angle - 0.5),
  );
  ctx.lineTo(
    x + dx - head * Math.cos(angle + 0.5),
    y + dy - head * Math.sin(angle + 0.5),
  );
  ctx.closePath();
  ctx.fill();
}
