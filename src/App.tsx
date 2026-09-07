import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ChevronDown,
  CircleHelp,
  Layers3,
  Moon,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sun,
  WandSparkles,
} from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import Controls, { Toggle } from "./components/Controls";
import ContourPlot from "./components/ContourPlot";
import Explanation, {
  normalPhases,
  newtonPhases,
} from "./components/Explanation";
import Statistics from "./components/Statistics";
import { Formula, fmt } from "./components/Formula";
import {
  algorithms,
  algorithmById,
  defaults,
  simulate,
  statusText,
  type AlgorithmId,
  type Params,
} from "./engine/algorithms";
import {
  objectiveById,
  objectives,
  type ObjectiveId,
} from "./engine/objectives";
import type { Vec2 } from "./engine/math";
import { usePlayback } from "./hooks/usePlayback";
const SurfacePlot = lazy(() => import("./components/SurfacePlot"));
const createConfigs = (f: ObjectiveId) =>
  Object.fromEntries(
    algorithms.map((a) => [a.id, defaults(a.id, f)]),
  ) as Record<AlgorithmId, Params>;
export default function App() {
  const [objectiveId, setObjectiveId] = useState<ObjectiveId>("quadratic"),
    [algorithm, setAlgorithm] = useState<AlgorithmId>("gd"),
    [configs, setConfigs] = useState(() => createConfigs("quadratic"));
  const [start, setStart] = useState<Vec2>([-3, 2.5]),
    [mode, setMode] = useState<"contour" | "heatmap" | "surface">("contour"),
    [field, setField] = useState(false),
    [teaching, setTeaching] = useState(true);
  const [compare, setCompare] = useState(false),
    [compareIds, setCompareIds] = useState<AlgorithmId[]>([
      "gd",
      "momentum",
      "adam",
      "newton",
    ]),
    [help, setHelp] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem("visualize-algorithm-theme");
      return stored
        ? stored === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(
        "visualize-algorithm-theme",
        dark ? "dark" : "light",
      );
    } catch {
      /* Theme still works without storage. */
    }
  }, [dark]);
  const objective = objectiveById(objectiveId);
  const activeIds = useMemo(
    () =>
      compare
        ? [algorithm, ...compareIds.filter((id) => id !== algorithm)]
        : [algorithm],
    [compare, compareIds, algorithm],
  );
  const runs = useMemo(
    () => activeIds.map((id) => simulate(objective, id, configs[id], start)),
    [activeIds, objective, configs, start],
  );
  const playback = usePlayback(runs),
    run = runs[0],
    sample = run.history[Math.min(playback.index, run.history.length - 1)],
    next = run.history[Math.min(playback.index, run.history.length - 1) + 1];
  const setParam = (key: keyof Params, value: number) => {
    playback.replayOnChange();
    setConfigs((c) => ({
      ...c,
      [algorithm]: { ...c[algorithm], [key]: value },
    }));
  };
  const changeStart = (p: Vec2) => {
    playback.replayOnChange();
    setStart(p.map((v) => Number(v.toFixed(6))) as Vec2);
  };
  const changeAlgorithm = (id: AlgorithmId) => {
    playback.replayOnChange();
    setAlgorithm(id);
    if (compare)
      setCompareIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };
  const changeObjective = (id: ObjectiveId) => {
    playback.replayOnChange();
    setObjectiveId(id);
    setConfigs(createConfigs(id));
    setStart([...objectiveById(id).start]);
  };
  const changeCompare = (value: boolean) => {
    playback.replayOnChange();
    setCompare(value);
    if (value)
      setCompareIds((ids) =>
        ids.includes(algorithm) ? ids : [algorithm, ...ids],
      );
  };
  const toggleCompare = (id: AlgorithmId) => {
    if (id === algorithm) return;
    playback.replayOnChange();
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
    );
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,button,[contenteditable="true"]',
        )
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        playback.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        playback.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        playback.previous();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [playback.toggle, playback.next, playback.previous]);
  const plotProps = {
    objective,
    runs,
    clock: playback.clock,
    tick: playback.tick,
    field,
    dark,
    selected: algorithm,
    onStart: changeStart,
  };
  const phases = algorithm === "newton" ? newtonPhases : normalPhases;
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">
              <Activity size={25} strokeWidth={2} />
            </div>
            <div>
              <h1>
                Visualize<span>Algorithm</span>
              </h1>
              <p>优化算法可视化学习平台</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="teaching-toggle">
              <WandSparkles size={16} />
              <span>教学模式</span>
              <Toggle
                checked={teaching}
                onChange={() => setTeaching(!teaching)}
                label="教学模式"
              />
            </div>
            <span className="header-separator" />
            <button
              className="icon-button"
              title="使用提示"
              aria-label="使用提示"
              aria-expanded={help}
              onClick={() => setHelp(!help)}
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="icon-button"
              title={dark ? "切换浅色模式" : "切换深色模式"}
              aria-label={dark ? "切换浅色模式" : "切换深色模式"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        {help && (
          <motion.div
            className="help-strip"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MousePointer2 size={18} />
            <p>
              点击图形设置起点，拖动平移，滚轮缩放。三维模式中拖动旋转，右键拖动平移。
              <br />
              空格播放 / 暂停，← 上一步，→
              下一步。修改参数后会重新播放。曲线支持拖动，双击还原。
            </p>
            <button className="text-button" onClick={() => setHelp(false)}>
              知道了
            </button>
          </motion.div>
        )}
        <div className="workspace">
          <Controls
            algorithm={algorithm}
            setAlgorithm={changeAlgorithm}
            params={configs[algorithm]}
            setParam={setParam}
            start={start}
            setStart={changeStart}
            resetParams={() => {
              playback.replayOnChange();
              setConfigs((c) => ({
                ...c,
                [algorithm]: defaults(algorithm, objectiveId),
              }));
            }}
            field={field}
            setField={setField}
            compare={compare}
            setCompare={changeCompare}
            compareIds={compareIds}
            toggleCompare={toggleCompare}
          />
          <main className="center-column">
            <section className="visualization panel">
              <div className="visual-heading">
                <div>
                  <span className="eyebrow">FUNCTION LANDSCAPE</span>
                  <h2>
                    探索函数空间 <span className="section-number">02</span>
                  </h2>
                </div>
                <div className="select-wrap objective-select">
                  <select
                    aria-label="目标函数"
                    value={objectiveId}
                    onChange={(e) =>
                      changeObjective(e.target.value as ObjectiveId)
                    }
                  >
                    {objectives.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="objective-formula">
                <Formula tex={objective.formula} />
              </div>
              <div className="view-toolbar">
                <div className="segmented" role="group" aria-label="显示模式">
                  {(
                    [
                      { id: "contour", label: "Contour" },
                      { id: "heatmap", label: "Heatmap" },
                      { id: "surface", label: "3D Surface" },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.id}
                      aria-pressed={mode === v.id}
                      className={mode === v.id ? "active" : ""}
                      onClick={() => setMode(v.id)}
                    >
                      {v.id === "surface" && <Layers3 size={13} />}
                      {v.label}
                    </button>
                  ))}
                </div>
                <span className="plot-hint">
                  <MousePointer2 size={13} />
                  点击设置起点
                </span>
              </div>
              <Suspense
                fallback={
                  <div className="plot-loading">
                    <Layers3 size={30} />
                    <span>正在准备三维曲面…</span>
                  </div>
                }
              >
                {mode === "surface" ? (
                  <SurfacePlot {...plotProps} />
                ) : (
                  <ContourPlot {...plotProps} mode={mode} />
                )}
              </Suspense>
              <div className="plot-legend">
                <span>
                  <i className="legend-start" />
                  初始点
                </span>
                <span>
                  <i className="legend-optimum" />
                  {objective.id === "saddle" ? "鞍点 (0, 0)" : "已知全局最小值"}
                </span>
                <span>
                  <ArrowDownRight size={14} color="#8c72c6" />
                  梯度
                </span>
                <span>
                  <ArrowDownRight
                    size={14}
                    color={algorithmById(algorithm).color}
                  />
                  更新方向
                </span>
              </div>
              <div className="trajectory-legend">
                {runs.map((r) => {
                  const s =
                    r.history[Math.min(playback.index, r.history.length - 1)];
                  const a = algorithmById(r.algorithm);
                  return (
                    <button
                      key={r.algorithm}
                      className={r.algorithm === algorithm ? "selected" : ""}
                      onClick={() => changeAlgorithm(r.algorithm)}
                      title={`${a.name} · η=${r.params.lr} · ${statusText[s.status]}`}
                    >
                      <span
                        className="color-dot"
                        style={{ background: a.color }}
                      />
                      {a.short}
                      <code>{fmt(s.value, 3)}</code>
                      {s.status !== "running" && (
                        <span className="legend-done">结束</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="playback-panel panel">
              <div className="playback-main">
                <button
                  className={`play-button ${playback.playing ? "playing" : ""}`}
                  onClick={playback.toggle}
                  disabled={playback.max === 0}
                  aria-label={playback.playing ? "暂停" : "播放"}
                >
                  {playback.playing ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  {playback.playing ? "暂停" : "播放"}
                </button>
                <div className="step-buttons">
                  <button
                    className="icon-button"
                    aria-label="上一步"
                    title="上一步 ←"
                    disabled={playback.clock.current.position === 0}
                    onClick={playback.previous}
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="下一步"
                    title="下一步 →"
                    disabled={playback.index >= playback.max}
                    onClick={playback.next}
                  >
                    <SkipForward size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="重置"
                    title="重置"
                    onClick={playback.reset}
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
                <span className="playback-divider" />
                <div className="speed-control">
                  <span>速度</span>
                  <select
                    value={playback.speed}
                    aria-label="播放速度"
                    onChange={(e) => playback.setSpeed(Number(e.target.value))}
                  >
                    {[0.25, 0.5, 1, 2].map((v) => (
                      <option key={v} value={v}>
                        {v}×
                      </option>
                    ))}
                  </select>
                </div>
                <span className="playback-state">
                  {playback.playing
                    ? "正在演示"
                    : playback.index >= playback.max && playback.max > 0
                      ? "演示结束"
                      : playback.index === 0
                        ? "准备就绪"
                        : "已暂停"}
                </span>
              </div>
              <div className="timeline-row">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, playback.max)}
                  value={playback.index}
                  step={1}
                  aria-label="迭代时间轴"
                  disabled={playback.max === 0}
                  onChange={(e) => playback.seek(Number(e.target.value))}
                />
                <span>
                  {playback.index} <i>/ {playback.max}</i>
                </span>
              </div>
            </section>
            {teaching && (
              <section className="step-story">
                <div className="story-label">
                  <span>
                    {String(next ? playback.phase + 1 : 6).padStart(2, "0")}
                  </span>
                  <b>
                    {next
                      ? phases[playback.phase]
                      : sample.status === "running"
                        ? "观察当前点"
                        : statusText[sample.status]}
                  </b>
                </div>
                <div className="phase-progress">
                  {phases.map((p, i) => (
                    <span
                      key={p}
                      title={p}
                      className={
                        i <= (next ? playback.phase : 5) ? "active" : ""
                      }
                    />
                  ))}
                </div>
                <p>
                  {next
                    ? playback.phase < 2
                      ? "先观察当前点的函数值和梯度；梯度是局部增长最快的方向。"
                      : playback.phase < 4
                        ? algorithm === "newton"
                          ? "将 Hessian 的逆矩阵乘以梯度，再取负号，得到更新方向。"
                          : algorithmById(algorithm).explanation
                        : "沿实际更新方向平滑移动；到达下一点后，重新计算所有数值。"
                    : objective.description}
                </p>
              </section>
            )}
          </main>
          <Explanation
            run={run}
            index={playback.index}
            phase={playback.phase}
            teaching={teaching}
            objective={objective}
          />
        </div>
        <Statistics runs={runs} index={playback.index} dark={dark} />
        <footer className="app-footer">
          <span>
            <Activity size={13} />
            VisualizeAlgorithm
          </span>
          <span>同一起点，不同路径。探索算法如何找到答案。</span>
          <span>12 种算法 · 9 个函数</span>
        </footer>
      </div>
    </MotionConfig>
  );
}
