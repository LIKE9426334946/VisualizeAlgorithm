import { useState } from "react";
import { BookOpen, ChevronDown, Sparkles, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { algorithmById, statusText, type Run } from "../engine/algorithms";
import { inverse, eigenvalues } from "../engine/math";
import type { Objective } from "../engine/objectives";
import { Formula, fmt, matTex, vecTex, texNumber } from "./Formula";
export const normalPhases = [
  "观察当前点",
  "计算梯度",
  "查看下降方向",
  "准备更新",
  "沿方向移动",
  "更新当前位置",
];
export const newtonPhases = [
  "计算 Gradient",
  "计算 Hessian",
  "求 Hessian 逆矩阵",
  "计算更新方向",
  "沿方向移动",
  "更新当前位置",
];
export default function Explanation({
  run,
  index,
  phase,
  teaching,
  objective,
}: {
  run: Run;
  index: number;
  phase: number;
  teaching: boolean;
  objective: Objective;
}) {
  const [why, setWhy] = useState(false),
    [details, setDetails] = useState(false);
  const a = algorithmById(run.algorithm),
    k = Math.min(index, run.history.length - 1),
    s = run.history[k],
    next = run.history[k + 1],
    newton = a.id === "newton",
    stopped = s.status !== "running",
    hInverse = s.differentiable ? inverse(s.hessian) : null;
  const evals = s.differentiable ? eigenvalues(s.hessian) : null;
  const stationaryInfo =
    s.status === "stationary"
      ? evals && evals[0] > 0
        ? "Hessian 正定：这是一个数值上接近的局部极小点；是否全局最优仍取决于目标函数。"
        : evals && evals[0] < 0 && evals[1] > 0
          ? "Hessian 有正、负特征值：这里接近鞍点，不是最小值。"
          : "梯度很小，但二阶条件尚不能确认极小值。"
      : null;
  return (
    <aside className="explanation panel">
      <div className="panel-heading">
        <BookOpen size={17} />
        <h2>理解这一步</h2>
        <span className="section-number">03</span>
      </div>
      <div className="explanation-body">
        <div className="iteration-title">
          <span>ITERATION</span>
          <b>
            {String(s.k).padStart(3, "0")}
            <small> / {run.params.iterations}</small>
          </b>
        </div>
        <div className="live-numbers">
          <div>
            <span>当前 Loss</span>
            <strong>{fmt(s.value)}</strong>
          </div>
          <div>
            <span>梯度范数</span>
            <strong>{fmt(s.gradientNorm)}</strong>
          </div>
        </div>
        <div className={`status-pill ${stopped ? "finished" : ""}`}>
          <span className="status-indicator" />
          {stopped
            ? statusText[s.status]
            : (newton ? newtonPhases : normalPhases)[phase]}
        </div>
        <section className="math-section">
          <div className="small-heading">
            <span>更新公式</span>
            <span>{a.short}</span>
          </div>
          <Formula tex={a.formula} block />
          <div className="math-value-row">
            <span>
              {newton
                ? "阻尼系数 η"
                : a.id === "bfgs" || a.id === "cg"
                  ? "回溯后的 α"
                  : "Learning Rate η"}
            </span>
            <code>{fmt(next?.alpha ?? run.params.lr)}</code>
          </div>
        </section>
        <section className="math-section">
          <div className="small-heading">
            <span>当前位置</span>
            <span>xₖ</span>
          </div>
          <div className="coordinate-display">
            <span>
              <small>x</small>
              {fmt(s.point[0])}
            </span>
            <span>
              <small>y</small>
              {fmt(s.point[1])}
            </span>
          </div>
          <div className="small-heading gradient-heading">
            <span>完整 Gradient</span>
            <span>∇f(xₖ)</span>
          </div>
          <Formula tex={`\\nabla f(x_k)=${vecTex(s.gradient)}`} />
          {next && ["sgd", "minibatch", "nesterov"].includes(a.id) && (
            <div className="sample-gradient">
              <span>{a.id === "nesterov" ? "前瞻点梯度" : "本次抽样梯度"}</span>
              <Formula tex={`g_k=${vecTex(next.usedGradient)}`} />
              {a.id === "nesterov" ? (
                <small>
                  前瞻点 ({next.evaluationPoint.map((v) => fmt(v)).join(", ")})
                </small>
              ) : (
                <small>
                  样本编号{" "}
                  {next.batch
                    .slice(0, 8)
                    .map((i) => i + 1)
                    .join(", ")}
                  {next.batch.length > 8 ? "…" : ""} · 共 {next.batch.length} 个
                </small>
              )}
            </div>
          )}
        </section>
        {(newton || details) && (
          <section className="math-section hessian-section">
            <div className="small-heading">
              <span>Hessian Matrix</span>
              <span>H(xₖ)</span>
            </div>
            <Formula tex={`H=${matTex(s.hessian)}`} />
            {newton && (
              <>
                <div className="small-heading">
                  <span>逆矩阵</span>
                  <span>H⁻¹</span>
                </div>
                <Formula
                  tex={
                    hInverse
                      ? `H^{-1}=${matTex(hInverse)}`
                      : "H^{-1}\\;\\text{不存在}"
                  }
                />
              </>
            )}
            {evals && (
              <small>特征值：{evals.map((v) => fmt(v)).join("，")}</small>
            )}
          </section>
        )}
        {next && (
          <section className="math-section update-section">
            <div className="small-heading">
              <span>本次位移 Δx</span>
              <span>α · pₖ</span>
            </div>
            <Formula
              tex={`${vecTex(next.point.map((v, i) => v - s.point[i]))}=${texNumber(next.alpha)}\\cdot${vecTex(next.direction)}`}
            />
            <div className="next-position">
              <span>下一位置 xₖ₊₁</span>
              <code>({next.point.map((v) => fmt(v)).join(", ")})</code>
            </div>
            {next.note && (
              <p className="numeric-note">
                <AlertCircle size={14} />
                {next.note}
              </p>
            )}
          </section>
        )}
        {stationaryInfo && (
          <p className="numeric-note">
            <AlertCircle size={15} />
            {stationaryInfo}
          </p>
        )}
        {s.note && stopped && (
          <p className="numeric-note">
            <AlertCircle size={15} />
            {s.note}
          </p>
        )}
        {!s.differentiable && (
          <p className="numeric-note">
            Ackley 在原点不可微，梯度和 Hessian 不存在。已识别已知最小值并停止。
          </p>
        )}
        <button
          className="details-button"
          onClick={() => setDetails(!details)}
          aria-expanded={details}
        >
          {details ? "收起" : "展开"}计算细节{" "}
          <ChevronDown size={14} className={details ? "rotate" : ""} />
        </button>
        {details && next && (
          <div className="intermediates">
            {["momentum", "nesterov"].includes(a.id) && (
              <>
                <span>下一速度</span>
                <Formula tex={`v_{k+1}=${vecTex(next.velocity)}`} />
              </>
            )}
            {["adagrad", "rmsprop", "adam"].includes(a.id) && (
              <>
                <span>平方梯度累计 / 二阶矩</span>
                <Formula tex={`v_{k+1}=${vecTex(next.secondMoment)}`} />
                {a.id === "adam" && (
                  <>
                    <span>一阶矩与偏差修正</span>
                    <Formula tex={`m_{k+1}=${vecTex(next.firstMoment)}`} />
                    <Formula
                      tex={`\\widehat m=${vecTex(next.correctedFirst)},\\quad\\widehat v=${vecTex(next.correctedSecond)}`}
                    />
                  </>
                )}
                <span>各坐标有效缩放系数</span>
                <Formula
                  tex={`\\frac{\\eta}{\\sqrt{${a.id === "adam" ? "\\widehat v" : "v"}}+\\epsilon}=${vecTex(next.effectiveRate)}`}
                />
              </>
            )}
            {a.id === "bfgs" && (
              <>
                <span>实际使用的逆 Hessian 近似 Bₖ</span>
                <Formula tex={`B_k=${matTex(next.approximation)}`} />
                <small>
                  上方真实 Hessian 仅用于教学对照，BFGS 更新不使用它。
                </small>
              </>
            )}
            {a.id === "cg" && (
              <Formula
                tex={`\\beta_k^{PR+}=${texNumber(next.conjugateBeta)}`}
              />
            )}
            {a.id === "coordinate" && (
              <p>本步只更新 {next.coordinate === 0 ? "x" : "y"} 坐标。</p>
            )}
            <span>代入下一点</span>
            <Formula
              tex={`f(${next.point.map(texNumber).join(",")})=${texNumber(next.value)}`}
            />
          </div>
        )}
        {teaching && (
          <section className="teaching-card">
            <div>
              <Sparkles size={16} />
              <b>一点直觉</b>
            </div>
            <p>{a.explanation}</p>
            <button
              className="why-button"
              onClick={() => setWhy(!why)}
              aria-expanded={why}
            >
              为什么？
              <ChevronDown size={14} className={why ? "rotate" : ""} />
            </button>
            <AnimatePresence initial={false}>
              {why && (
                <motion.div
                  className="derivation"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p>{a.why}</p>
                  <Formula tex={a.derivation} block />
                  {objective.id === "saddle" && (
                    <p>
                      当前 Saddle
                      函数无全局最小值，不能期待轨迹最终收敛到最优点。
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>
    </aside>
  );
}
