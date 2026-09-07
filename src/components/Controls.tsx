import { useEffect, useId, useState } from "react";
import {
  ChevronDown,
  SlidersHorizontal,
  Target,
  RefreshCw,
} from "lucide-react";
import {
  algorithms,
  algorithmById,
  type AlgorithmId,
  type Params,
} from "../engine/algorithms";
import type { Vec2 } from "../engine/math";
export function NumericField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number | "any";
  hint?: string;
}) {
  const id = useId(),
    [draft, setDraft] = useState(String(value)),
    [error, setError] = useState(false);
  useEffect(() => {
    setDraft(String(value));
    setError(false);
  }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (
      draft.trim() === "" ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (step === 1 && !Number.isInteger(n))
    ) {
      setError(true);
      return;
    }
    setError(false);
    if (n !== value) onChange(n);
  };
  return (
    <div className="number-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-invalid={error}
        aria-describedby={error ? id + "-error" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          }
        }}
      />
      {hint && <small>{hint}</small>}
      {error && (
        <small className="input-error" id={id + "-error"}>
          请输入 {min}～{max}
          {step === 1 ? " 的整数" : ""}
        </small>
      )}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
interface Props {
  algorithm: AlgorithmId;
  setAlgorithm: (id: AlgorithmId) => void;
  params: Params;
  setParam: (key: keyof Params, value: number) => void;
  start: Vec2;
  setStart: (p: Vec2) => void;
  resetParams: () => void;
  field: boolean;
  setField: (b: boolean) => void;
  compare: boolean;
  setCompare: (b: boolean) => void;
  compareIds: AlgorithmId[];
  toggleCompare: (id: AlgorithmId) => void;
}
export default function Controls(p: Props) {
  const algo = algorithmById(p.algorithm),
    adaptive = ["adagrad", "rmsprop", "adam"].includes(p.algorithm),
    second = ["newton", "bfgs", "cg"].includes(p.algorithm);
  return (
    <aside className="controls panel">
      <div className="panel-heading">
        <SlidersHorizontal size={17} />
        <h2>算法与参数</h2>
        <span className="section-number">01</span>
      </div>
      <div className="control-body">
        <section className="control-section">
          <label className="field-label" htmlFor="algorithm">
            优化算法
          </label>
          <div className="select-wrap">
            <select
              id="algorithm"
              value={p.algorithm}
              onChange={(e) => p.setAlgorithm(e.target.value as AlgorithmId)}
            >
              {algorithms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="algorithm-caption">
            <span className="color-dot" style={{ background: algo.color }} />
            {algo.chinese}
            <span className="tag">{algo.order}</span>
          </div>
        </section>
        <section className="control-section">
          <div className="label-row">
            <label htmlFor="learning-rate">
              {second
                ? p.algorithm === "newton"
                  ? "阻尼系数"
                  : "回溯初始步长"
                : "Learning Rate"}{" "}
              <span className="math-symbol">η</span>
            </label>
            <button
              className="icon-button subtle"
              aria-label="恢复当前算法的推荐参数"
              title="恢复推荐参数"
              onClick={p.resetParams}
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <NumericField
            label="η 数值"
            value={p.params.lr}
            min={1e-8}
            max={10}
            onChange={(v) => p.setParam("lr", v)}
          />
          <input
            id="learning-rate"
            aria-label="对数调节学习率"
            type="range"
            className="lr-slider"
            min={-5}
            max={1}
            step={0.025}
            value={Math.log10(p.params.lr)}
            onChange={(e) =>
              p.setParam(
                "lr",
                Number((10 ** Number(e.target.value)).toPrecision(3)),
              )
            }
          />
          <div className="range-labels">
            <span>0.00001</span>
            <span>0.01</span>
            <span>10</span>
          </div>
          {["momentum", "nesterov"].includes(p.algorithm) && (
            <NumericField
              label="Momentum · μ"
              value={p.params.momentum}
              min={0}
              max={0.9999}
              onChange={(v) => p.setParam("momentum", v)}
            />
          )}
          {["rmsprop", "adam"].includes(p.algorithm) && (
            <NumericField
              label={
                p.algorithm === "adam" ? "β₁ · 一阶矩衰减" : "β · 平方梯度衰减"
              }
              value={p.params.beta}
              min={0}
              max={0.99999}
              onChange={(v) => p.setParam("beta", v)}
            />
          )}
          {p.algorithm === "adam" && (
            <NumericField
              label="β₂ · 二阶矩衰减"
              value={p.params.beta2}
              min={0}
              max={0.999999}
              onChange={(v) => p.setParam("beta2", v)}
            />
          )}
          {adaptive && (
            <NumericField
              label="Epsilon · ε"
              value={p.params.epsilon}
              min={1e-12}
              max={1}
              onChange={(v) => p.setParam("epsilon", v)}
            />
          )}
          {p.algorithm === "minibatch" && (
            <NumericField
              label="Batch Size"
              value={p.params.batchSize}
              min={1}
              max={64}
              step={1}
              onChange={(v) => p.setParam("batchSize", v)}
            />
          )}
          {["sgd", "minibatch"].includes(p.algorithm) && (
            <p className="control-hint">
              64 个有限和样本 · 固定种子 42
              <br />
              重播使用相同的抽样顺序。
            </p>
          )}
          <div className="field-pair">
            <NumericField
              label="迭代上限"
              value={p.params.iterations}
              min={1}
              max={2000}
              step={1}
              onChange={(v) => p.setParam("iterations", v)}
            />
            <NumericField
              label="停止阈值 ‖∇f‖"
              value={p.params.threshold}
              min={1e-12}
              max={1}
              onChange={(v) => p.setParam("threshold", v)}
            />
          </div>
          <p className="control-hint">修改参数后，从同一起点重新播放。</p>
        </section>
        <section className="control-section">
          <div className="label-row">
            <span className="inline-label">
              <Target size={15} />
              初始位置
            </span>
            <code>x₀</code>
          </div>
          <div className="field-pair">
            <NumericField
              label="x"
              value={p.start[0]}
              min={-1000}
              max={1000}
              onChange={(v) => p.setStart([v, p.start[1]])}
            />
            <NumericField
              label="y"
              value={p.start[1]}
              min={-1000}
              max={1000}
              onChange={(v) => p.setStart([p.start[0], v])}
            />
          </div>
          <p className="control-hint">也可以点击图中任意位置。</p>
          <div className="setting-row">
            <span>显示梯度场</span>
            <Toggle
              checked={p.field}
              onChange={() => p.setField(!p.field)}
              label="显示梯度场"
            />
          </div>
          <p className="control-hint">灰色箭头指向正梯度；长度经归一化。</p>
        </section>
        <section className="control-section compare-section">
          <div className="setting-row">
            <div>
              <b>路径比较</b>
              <small>从相同起点出发</small>
            </div>
            <Toggle
              checked={p.compare}
              onChange={() => p.setCompare(!p.compare)}
              label="路径比较"
            />
          </div>
          {p.compare && (
            <>
              <div className="compare-picker">
                {algorithms.map((a) => (
                  <label
                    key={a.id}
                    className={p.compareIds.includes(a.id) ? "checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={p.compareIds.includes(a.id)}
                      onChange={() => p.toggleCompare(a.id)}
                      disabled={a.id === p.algorithm}
                    />
                    <span
                      className="color-dot"
                      style={{ background: a.color }}
                    />
                    {a.short}
                  </label>
                ))}
              </div>
              <p className="control-hint">
                各算法保留自己的参数。用上方选择器切换并调整；当前算法始终显示。
              </p>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
