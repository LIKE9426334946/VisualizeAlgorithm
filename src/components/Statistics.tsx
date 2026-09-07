import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ListOrdered, TrendingDown } from "lucide-react";
import {
  algorithmById,
  statusText,
  type Run,
  type Sample,
} from "../engine/algorithms";
import { fmt } from "./Formula";
import type { Data, Layout } from "plotly.js";
const loadPlotly = () =>
  import("plotly.js-basic-dist-min").then((m) => m.default);
const metrics = [
  {
    key: "value",
    title: "Loss Curve",
    label: "函数值 · f(x, y)",
    color: "#4070ee",
  },
  {
    key: "gradientNorm",
    title: "Gradient Norm",
    label: "梯度范数 · ‖∇f‖",
    color: "#8a75cc",
  },
  {
    key: "alpha",
    title: "Learning Rate",
    label: "实际步长系数 · α",
    color: "#3ba38d",
  },
  {
    key: "stepLength",
    title: "Step Length",
    label: "位移长度 · ‖Δx‖",
    color: "#e4a04d",
  },
] as const;
function MetricChart({
  runs,
  index,
  dark,
  metric,
}: {
  runs: Run[];
  index: number;
  dark: boolean;
  metric: (typeof metrics)[number];
}) {
  const host = useRef<HTMLDivElement>(null),
    [error, setError] = useState(false);
  const latest = useRef({ runs, index, dark, metric });
  latest.current = { runs, index, dark, metric };
  const draw = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true,
      initialized = false,
      observer: ResizeObserver | undefined;
    const el = host.current!;
    loadPlotly()
      .then((Plotly) => {
        if (!alive) return;
        let drawing = false,
          pending = false;
        const render = async () => {
          if (!alive) return;
          if (drawing) {
            pending = true;
            return;
          }
          drawing = true;
          const { runs, index, dark, metric } = latest.current;
          const traces: Data[] = runs.map((run) => {
            const samples = run.history.slice(0, index + 1);
            return {
              type: "scatter",
              mode: samples.length === 1 ? "markers" : "lines",
              name: algorithmById(run.algorithm).short,
              x: samples.map((s) => s.k),
              y: samples.map((s) =>
                Number.isFinite(s[metric.key]) ? s[metric.key] : null,
              ),
              line: { color: algorithmById(run.algorithm).color, width: 2 },
              marker: { size: 5 },
              hovertemplate:
                "%{fullData.name}<br>k = %{x}<br>%{y:.5g}<extra></extra>",
            };
          });
          const layout: Partial<Layout> = {
            height: 136,
            margin: { t: 7, b: 26, l: 46, r: 12 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            showlegend: false,
            font: {
              family: "Inter, system-ui, sans-serif",
              size: 11,
              color: dark ? "#8593ab" : "#8b96a7",
            },
            xaxis: {
              gridcolor: dark ? "#ffffff08" : "#1e355b08",
              zeroline: false,
              nticks: 4,
              range: [0, Math.max(10, index)],
              fixedrange: false,
            },
            yaxis: {
              gridcolor: dark ? "#ffffff0d" : "#1e355b0c",
              zeroline: false,
              nticks: 3,
              automargin: true,
              tickformat: ".2~g",
            },
            hovermode: "closest",
            dragmode: "pan",
            uirevision:
              "metric-" +
              metric.key +
              "-" +
              runs.map((r) => r.params.lr).join(),
          };
          try {
            await Plotly.react(el, traces, layout, {
              displayModeBar: false,
              responsive: true,
              scrollZoom: false,
            });
            initialized = true;
          } catch {
            if (alive) setError(true);
          } finally {
            drawing = false;
            if (!alive) {
              Plotly.purge(el);
              return;
            }
            if (pending) {
              pending = false;
              void render();
            }
          }
        };
        draw.current = () => void render();
        draw.current();
        observer = new ResizeObserver(() => {
          if (initialized) void Plotly.Plots.resize(el);
        });
        observer.observe(el);
      })
      .catch(() => setError(true));
    return () => {
      alive = false;
      observer?.disconnect();
      draw.current = () => {};
      void loadPlotly().then((p) => {
        if (initialized) p.purge(el);
      });
    };
  }, []);
  useEffect(() => {
    draw.current();
  }, [runs, index, dark, metric]);
  const sample = runs[0].history[Math.min(index, runs[0].history.length - 1)];
  return (
    <section className="metric-card panel">
      <div className="metric-head">
        <span className="metric-icon" style={{ color: metric.color }}>
          <TrendingDown size={15} />
        </span>
        <span>{metric.title}</span>
        <strong>{fmt(sample[metric.key])}</strong>
      </div>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-plot" ref={host} />
      {error && (
        <p className="chart-error">
          曲线未能加载，数值可在下方迭代记录中查看。
        </p>
      )}
    </section>
  );
}
export default function Statistics({
  runs,
  index,
  dark,
}: {
  runs: Run[];
  index: number;
  dark: boolean;
}) {
  const [history, setHistory] = useState(false),
    [page, setPage] = useState(0);
  const primary = runs[0],
    count = Math.min(index + 1, primary.history.length),
    pages = Math.ceil(count / 20);
  useEffect(() => setPage(0), [runs]);
  const rows = useMemo(
    () =>
      primary.history
        .slice(
          Math.max(0, count - (page + 1) * 20),
          Math.max(0, count - page * 20),
        )
        .reverse(),
    [primary, count, page],
  );
  return (
    <section className="statistics">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CONVERGENCE</span>
          <h2>每一步，都看得见</h2>
        </div>
        <button
          className={`text-button ${history ? "selected" : ""}`}
          onClick={() => setHistory(!history)}
          aria-expanded={history}
        >
          <ListOrdered size={16} />
          迭代记录 <ChevronDown size={14} className={history ? "rotate" : ""} />
        </button>
      </div>
      <div className="metric-grid">
        {metrics.map((m) => (
          <MetricChart
            key={m.key}
            metric={m}
            runs={runs}
            index={index}
            dark={dark}
          />
        ))}
      </div>
      {history && (
        <div className="history-panel panel">
          <div className="history-heading">
            <b>Convergence History · {algorithmById(primary.algorithm).name}</b>
            <span>Loss 即当前目标函数值；α 为更新方向前的系数。</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>迭代 k</th>
                  <th>x</th>
                  <th>y</th>
                  <th>f(x, y)</th>
                  <th>‖∇f‖</th>
                  <th>α</th>
                  <th>‖Δx‖</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: Sample) => (
                  <tr key={s.k}>
                    <td>{s.k}</td>
                    <td>{fmt(s.point[0])}</td>
                    <td>{fmt(s.point[1])}</td>
                    <td>{fmt(s.value)}</td>
                    <td>{fmt(s.gradientNorm)}</td>
                    <td>{fmt(s.alpha)}</td>
                    <td>{fmt(s.stepLength)}</td>
                    <td>{statusText[s.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              最近记录优先 · 第 {page + 1} / {Math.max(1, pages)} 页
            </span>
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              较新
            </button>
            <button
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
            >
              较早
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
