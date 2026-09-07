import {
  add,
  sub,
  scale,
  dot,
  norm,
  mv,
  identity,
  inverse,
  eigenvalues,
  type Vec2,
  type Mat2,
} from "./math";
import { evaluate, type Objective, type ObjectiveId } from "./objectives";
export type AlgorithmId =
  | "gd"
  | "sgd"
  | "minibatch"
  | "momentum"
  | "nesterov"
  | "adagrad"
  | "rmsprop"
  | "adam"
  | "newton"
  | "bfgs"
  | "cg"
  | "coordinate";
export interface Algorithm {
  id: AlgorithmId;
  name: string;
  short: string;
  chinese: string;
  color: string;
  order: string;
  formula: string;
  explanation: string;
  why: string;
  derivation: string;
}
export const algorithms: Algorithm[] = [
  {
    id: "gd",
    name: "Gradient Descent",
    short: "GD",
    chinese: "梯度下降",
    color: "#4070ee",
    order: "一阶方法",
    formula: "x_{k+1}=x_k-\\eta\\nabla f(x_k)",
    explanation:
      "梯度指向函数增长最快的方向。沿负梯度迈出一小步，通常可以减小函数值。",
    why: "一阶泰勒展开表明，足够小的负梯度步会让函数值下降。步长过大时，这个局部近似可能失效。",
    derivation: "f(x-\\eta g)\\approx f(x)-\\eta\\|g\\|^2",
  },
  {
    id: "sgd",
    name: "Stochastic Gradient Descent",
    short: "SGD",
    chinese: "随机梯度下降",
    color: "#8b5cf6",
    order: "随机一阶方法",
    formula: "x_{k+1}=x_k-\\eta\\nabla f_{i_k}(x_k)",
    explanation:
      "每步只随机抽取一个样本。抽样梯度的期望等于完整梯度，但单次方向会有波动。",
    why: "这里构造 64 个样本损失：fᵢ(x)=f(x)+aᵢᵀx，向量 aᵢ 在单位圆均匀排列，总和为零。均值恰好为所选目标函数；这是一种明确的有限和教学模型。",
    derivation:
      "f=\\frac1{64}\\sum_i f_i,\\quad \\mathbb E[\\nabla f_i]=\\nabla f",
  },
  {
    id: "minibatch",
    name: "Mini-batch SGD",
    short: "Mini-batch",
    chinese: "小批量梯度下降",
    color: "#a855a5",
    order: "随机一阶方法",
    formula: "x_{k+1}=x_k-\\eta\\frac1{|B_k|}\\sum_{i\\in B_k}\\nabla f_i(x_k)",
    explanation:
      "随机抽取一批样本，再平均它们的梯度。更大的批量通常使更新方向更稳定。",
    why: "使用与 SGD 相同的 64 个有限和样本，每步无放回抽样。批量为 64 时梯度恰好等于完整梯度；固定种子使重播结果一致。",
    derivation: "g_B=\\frac1{|B|}\\sum_{i\\in B}g_i,\\quad g_{B=64}=\\nabla f",
  },
  {
    id: "momentum",
    name: "Momentum",
    short: "Momentum",
    chinese: "动量法",
    color: "#e89532",
    order: "一阶方法",
    formula: "v_{k+1}=\\mu v_k-\\eta g_k,\\quad x_{k+1}=x_k+v_{k+1}",
    explanation:
      "累积之前的移动方向，像小球带着惯性滑向谷底。惯性也可能让它越过最小值。",
    why: "速度是过去负梯度的指数加权和。方向一致时会加速，方向交替时会相互抵消。",
    derivation: "v_{k+1}=-\\eta\\sum_{j=0}^{k}\\mu^{k-j}g_j",
  },
  {
    id: "nesterov",
    name: "Nesterov Momentum",
    short: "Nesterov",
    chinese: "前瞻动量法",
    color: "#d17b42",
    order: "一阶方法",
    formula: "g_k=\\nabla f(x_k+\\mu v_k),\\quad v_{k+1}=\\mu v_k-\\eta g_k",
    explanation:
      "先看惯性将把你带到哪里，再在前瞻点计算梯度，为当前速度作修正。",
    why: "梯度在 xₖ+μvₖ 处计算，而不是当前位置。因此算法可以在惯性过冲前感知即将遇到的坡度。",
    derivation:
      "\\widetilde x_k=x_k+\\mu v_k,\\quad x_{k+1}=\\widetilde x_k-\\eta\\nabla f(\\widetilde x_k)",
  },
  {
    id: "adagrad",
    name: "Adagrad",
    short: "Adagrad",
    chinese: "自适应梯度法",
    color: "#b78d15",
    order: "自适应一阶方法",
    formula:
      "s_{k+1}=s_k+g_k^2,\\quad x_{k+1}=x_k-\\eta\\frac{g_k}{\\sqrt{s_{k+1}}+\\epsilon}",
    explanation:
      "每个坐标都有自己的缩放因子。历史梯度越大的方向，之后的有效步长越小。",
    why: "累加梯度平方使分母持续增大，有助于处理不同尺度，但长期运行也可能导致步长过小。",
    derivation: "s_{k+1,j}=\\sum_{t=0}^{k}g_{t,j}^2",
  },
  {
    id: "rmsprop",
    name: "RMSProp",
    short: "RMSProp",
    chinese: "均方根传播",
    color: "#0c9caa",
    order: "自适应一阶方法",
    formula:
      "s_{k+1}=\\beta s_k+(1-\\beta)g_k^2,\\quad x_{k+1}=x_k-\\eta\\frac{g_k}{\\sqrt{s_{k+1}}+\\epsilon}",
    explanation:
      "用最近梯度平方的滑动平均来调整各坐标的步长，逐渐淡化较早的历史。",
    why: "与 Adagrad 不同，平方梯度不再无限累加。β 控制记忆长度，ε 避免除以零。",
    derivation: "s_{k+1}=(1-\\beta)\\sum_{j=0}^{k}\\beta^{k-j}g_j^2",
  },
  {
    id: "adam",
    name: "Adam",
    short: "Adam",
    chinese: "自适应矩估计",
    color: "#e26375",
    order: "自适应一阶方法",
    formula:
      "x_{k+1}=x_k-\\eta\\frac{\\widehat m_{k+1}}{\\sqrt{\\widehat v_{k+1}}+\\epsilon}",
    explanation:
      "同时记录梯度的动量和平方梯度，并作偏差修正，让每个方向使用自适应更新。",
    why: "从零初始化的滑动平均在早期偏小，因此分别除以 1−β₁ᵗ 和 1−β₂ᵗ。所有平方、平方根和除法均逐坐标进行。",
    derivation:
      "m_t=\\beta_1 m_{t-1}+(1-\\beta_1)g,\\quad v_t=\\beta_2v_{t-1}+(1-\\beta_2)g^2\\quad\\widehat m_t=\\frac{m_t}{1-\\beta_1^t},\\quad\\widehat v_t=\\frac{v_t}{1-\\beta_2^t}",
  },
  {
    id: "newton",
    name: "Newton Method",
    short: "Newton",
    chinese: "牛顿法",
    color: "#31a280",
    order: "二阶方法",
    formula: "x_{k+1}=x_k-\\eta H_k^{-1}\\nabla f(x_k)",
    explanation:
      "Hessian 描述局部曲率。用它修正梯度的尺度和方向，就得到 Newton 更新。η=1 为完整 Newton 步。",
    why: "对局部二次近似求驻点得到 Hp=−g。本平台展示阻尼 Newton 更新。Hessian 奇异时停止；不正定时会提示，可能走向鞍点或上坡。",
    derivation: "q(p)=f(x)+g^Tp+\\tfrac12p^THp,\\quad \\nabla q=g+Hp=0",
  },
  {
    id: "bfgs",
    name: "Quasi-Newton (BFGS)",
    short: "BFGS",
    chinese: "拟牛顿法",
    color: "#429b64",
    order: "拟二阶方法",
    formula:
      "p_k=-B_k g_k,\\quad B_{k+1}=(I-\\rho sy^T)B_k(I-\\rho ys^T)+\\rho ss^T",
    explanation:
      "用位置和梯度的变化更新逆 Hessian 近似 B，无需在算法中计算真实 Hessian。",
    why: "s=xₖ₊₁−xₖ，y=gₖ₊₁−gₖ，ρ=1/(yᵀs)。使用 Armijo 回溯寻找下降步长，只有曲率条件 yᵀs>0 满足时才更新 B。",
    derivation: "B_{k+1}y=s,\\quad f(x+\\alpha p)\\le f(x)+10^{-4}\\alpha g^Tp",
  },
  {
    id: "cg",
    name: "Conjugate Gradient",
    short: "CG",
    chinese: "非线性共轭梯度",
    color: "#5f91c2",
    order: "一阶方法",
    formula:
      "p_k=-g_k+\\beta_k p_{k-1},\\quad\\beta_k=\\max(0,\\frac{g_k^T(g_k-g_{k-1})}{g_{k-1}^Tg_{k-1}})",
    explanation:
      "采用 Polak–Ribière+ 非线性共轭梯度，利用上一方向减少反复折返。",
    why: "使用 Armijo 回溯，若方向不再下降则重启为负梯度。这里是可用于非线性目标的变体，不承诺线性 CG 的有限步收敛。",
    derivation: "x_{k+1}=x_k+\\alpha_k p_k,\\quad g_k^Tp_k<0",
  },
  {
    id: "coordinate",
    name: "Coordinate Descent",
    short: "Coordinate",
    chinese: "坐标下降",
    color: "#8572d3",
    order: "一阶方法",
    formula: "x_{k+1}=x_k-\\eta\\,\\partial_j f(x_k)e_j,\\quad j=k\\bmod2",
    explanation: "每一步只更新一个坐标，交替沿 x 和 y 轴移动，轨迹呈现折线。",
    why: "采用循环坐标梯度步，并非每次精确求解单坐标最小值。只有两个坐标的完整梯度都足够小时，才满足停止阈值。",
    derivation:
      "x_{k+1,j}=x_{k,j}-\\eta\\partial_jf,\\quad x_{k+1,i}=x_{k,i}\\;(i\\ne j)",
  },
];
export const algorithmById = (id: AlgorithmId) =>
  algorithms.find((a) => a.id === id)!;
export interface Params {
  lr: number;
  momentum: number;
  beta: number;
  beta2: number;
  epsilon: number;
  batchSize: number;
  iterations: number;
  threshold: number;
  seed: number;
}
export function defaults(id: AlgorithmId, f: ObjectiveId): Params {
  const base: Record<ObjectiveId, number> = {
    quadratic: 0.12,
    sphere: 0.12,
    rosenbrock: 0.001,
    himmelblau: 0.005,
    booth: 0.04,
    beale: 0.01,
    ackley: 0.025,
    rastrigin: 0.003,
    saddle: 0.08,
  };
  let lr = base[f];
  if (["adagrad", "rmsprop", "adam"].includes(id))
    lr = f === "rosenbrock" || f === "beale" ? 0.025 : 0.12;
  if (["newton", "bfgs", "cg"].includes(id)) lr = 1;
  return {
    lr,
    momentum: 0.85,
    beta: 0.9,
    beta2: 0.999,
    epsilon: 1e-8,
    batchSize: 16,
    iterations: 240,
    threshold: 1e-5,
    seed: 42,
  };
}
export type RunStatus =
  | "running"
  | "stationary"
  | "minimum"
  | "max-iterations"
  | "diverged"
  | "singular"
  | "line-search-failed";
export const statusText: Record<RunStatus, string> = {
  running: "进行中",
  stationary: "达到驻点阈值",
  minimum: "到达已知最小值",
  "max-iterations": "达到迭代上限",
  diverged: "数值越界，已停止",
  singular: "Hessian 奇异，已停止",
  "line-search-failed": "回溯未找到下降步",
};
export interface Sample {
  k: number;
  point: Vec2;
  value: number;
  gradient: Vec2;
  hessian: Mat2;
  gradientNorm: number;
  differentiable: boolean;
  // Incoming update: used gradient and all intermediates were computed at history[k-1].
  usedGradient: Vec2;
  evaluationPoint: Vec2;
  direction: Vec2;
  alpha: number;
  stepLength: number;
  velocity: Vec2;
  firstMoment: Vec2;
  secondMoment: Vec2;
  correctedFirst: Vec2;
  correctedSecond: Vec2;
  effectiveRate: Vec2;
  inverseHessian: Mat2 | null;
  approximation: Mat2;
  batch: number[];
  conjugateBeta: number;
  coordinate: number | null;
  note: string;
  status: RunStatus;
}
export interface Run {
  algorithm: AlgorithmId;
  params: Params;
  history: Sample[];
  status: RunStatus;
}
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function sampleGradient(
  g: Vec2,
  size: number,
  seed: number,
): { gradient: Vec2; indices: number[] } {
  const indices = Array.from({ length: 64 }, (_, i) => i),
    rand = random(seed);
  for (let i = 63; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const chosen = indices.slice(0, Math.max(1, Math.min(64, Math.floor(size))));
  if (chosen.length === 64) return { gradient: [...g], indices: chosen };
  const perturbation = chosen.reduce<Vec2>(
    (a, i) => [
      a[0] + Math.cos((2 * Math.PI * i) / 64),
      a[1] + Math.sin((2 * Math.PI * i) / 64),
    ],
    [0, 0],
  );
  return {
    gradient: add(g, scale(perturbation, 1 / chosen.length)),
    indices: chosen,
  };
}
function lineSearch(
  f: Objective,
  p: Vec2,
  d: Vec2,
  g: Vec2,
  initial: number,
): number | null {
  let alpha = initial;
  const v = f.value(p),
    slope = dot(g, d);
  if (slope >= 0) return null;
  for (let i = 0; i < 40; i++) {
    const next = f.value(add(p, scale(d, alpha)));
    if (Number.isFinite(next) && next <= v + 1e-4 * alpha * slope) return alpha;
    alpha *= 0.5;
  }
  return null;
}
function updateBfgs(B: Mat2, s: Vec2, y: Vec2): Mat2 {
  const ys = dot(y, s);
  if (ys <= 1e-10 * norm(y) * norm(s) || ys <= 1e-20) return B;
  const by = mv(B, y),
    yby = dot(y, by),
    factor = (ys + yby) / (ys * ys);
  return B.map((row, i) =>
    row.map(
      (v, j) => v + factor * s[i] * s[j] - (by[i] * s[j] + s[i] * by[j]) / ys,
    ),
  ) as Mat2;
}
function terminalStatus(f: Objective, sample: Sample, p: Params): RunStatus {
  if (!sample.differentiable && f.id === "ackley") return "minimum";
  if (
    !Number.isFinite(sample.value) ||
    !sample.point.every(Number.isFinite) ||
    Math.max(...sample.point.map(Math.abs)) > 1e6 ||
    Math.abs(sample.value) > 1e16
  )
    return "diverged";
  if (!Number.isFinite(sample.gradientNorm)) return "diverged";
  if (sample.gradientNorm <= p.threshold) return "stationary";
  if (sample.k >= p.iterations) return "max-iterations";
  return "running";
}
export function simulate(
  f: Objective,
  id: AlgorithmId,
  p: Params,
  start: Vec2,
): Run {
  if (
    !start.every(Number.isFinite) ||
    !Object.values(p).every(Number.isFinite) ||
    p.lr <= 0 ||
    p.epsilon <= 0 ||
    p.threshold <= 0 ||
    p.momentum < 0 ||
    p.momentum >= 1 ||
    p.beta < 0 ||
    p.beta >= 1 ||
    p.beta2 < 0 ||
    p.beta2 >= 1 ||
    p.iterations < 1 ||
    p.iterations > 2000
  )
    throw new Error("参数超出有效范围");
  const initial = evaluate(f, start);
  const first: Sample = {
    k: 0,
    point: [...start],
    ...initial,
    gradientNorm: norm(initial.gradient),
    usedGradient: initial.gradient,
    evaluationPoint: [...start],
    direction: [0, 0],
    alpha: 0,
    stepLength: 0,
    velocity: [0, 0],
    firstMoment: [0, 0],
    secondMoment: [0, 0],
    correctedFirst: [0, 0],
    correctedSecond: [0, 0],
    effectiveRate: [0, 0],
    inverseHessian: null,
    approximation: identity(),
    batch: [],
    conjugateBeta: 0,
    coordinate: null,
    note: "",
    status: "running",
  };
  first.status = terminalStatus(f, first, p);
  const history = [first];
  let velocity: Vec2 = [0, 0],
    m: Vec2 = [0, 0],
    v: Vec2 = [0, 0],
    B = identity(),
    lastG: Vec2 = [0, 0],
    lastD: Vec2 = [0, 0];
  for (
    let k = 0;
    k < p.iterations && history.at(-1)!.status === "running";
    k++
  ) {
    const current = history.at(-1)!,
      point = current.point,
      g = current.gradient;
    let used: Vec2 = [...g],
      evalPoint: Vec2 = [...point],
      d: Vec2 = scale(g, -1),
      alpha = p.lr,
      inv: Mat2 | null = null,
      batch: number[] = [],
      beta = 0,
      coordinate: number | null = null,
      note = "";
    let correctedM: Vec2 = [...m],
      correctedV: Vec2 = [...v],
      effective: Vec2 = [p.lr, p.lr];
    let approximation = B.map((row) => [...row]) as Mat2;
    if (id === "sgd" || id === "minibatch") {
      const s = sampleGradient(
        g,
        id === "sgd" ? 1 : p.batchSize,
        p.seed + k * 2654435761,
      );
      used = s.gradient;
      batch = s.indices;
      d = scale(used, -1);
    }
    if (id === "momentum" || id === "nesterov") {
      if (id === "nesterov") {
        evalPoint = add(point, scale(velocity, p.momentum));
        used = evaluate(f, evalPoint).gradient;
      }
      velocity = sub(scale(velocity, p.momentum), scale(used, p.lr));
      d = scale(velocity, 1 / p.lr);
    }
    if (id === "adagrad" || id === "rmsprop" || id === "adam") {
      v = v.map((a, j) =>
        id === "adagrad"
          ? a + g[j] ** 2
          : (id === "adam" ? p.beta2 : p.beta) * a +
            (1 - (id === "adam" ? p.beta2 : p.beta)) * g[j] ** 2,
      ) as Vec2;
      if (id === "adam") {
        m = m.map((a, j) => p.beta * a + (1 - p.beta) * g[j]) as Vec2;
        correctedM = scale(m, 1 / (1 - p.beta ** (k + 1)));
        correctedV = scale(v, 1 / (1 - p.beta2 ** (k + 1)));
      } else {
        correctedM = [...g];
        correctedV = [...v];
      }
      effective = correctedV.map(
        (a) => p.lr / (Math.sqrt(a) + p.epsilon),
      ) as Vec2;
      d = correctedM.map(
        (a, j) => -a / (Math.sqrt(correctedV[j]) + p.epsilon),
      ) as Vec2;
    }
    if (id === "newton") {
      inv = inverse(current.hessian);
      if (!inv) {
        current.status = "singular";
        current.note = "当前 Hessian 不可逆，无法计算 Newton 更新。";
        break;
      }
      d = scale(mv(inv, g), -1);
      if (eigenvalues(current.hessian)[0] <= 0)
        note = "Hessian 不正定：Newton 方向不保证下降，可能走向鞍点。";
    }
    if (id === "bfgs") {
      d = scale(mv(B, g), -1);
      if (dot(d, g) >= 0) {
        B = identity();
        approximation = identity();
        d = scale(g, -1);
        note = "近似方向不再下降，已重置 B 为单位阵。";
      }
    }
    if (id === "cg") {
      beta =
        k === 0
          ? 0
          : Math.max(
              0,
              dot(g, sub(g, lastG)) / Math.max(dot(lastG, lastG), 1e-30),
            );
      d = add(scale(g, -1), scale(lastD, beta));
      if (dot(d, g) >= -1e-12 * dot(g, g)) {
        d = scale(g, -1);
        beta = 0;
        note = "方向已重启为负梯度。";
      }
    }
    if (id === "bfgs" || id === "cg") {
      const found = lineSearch(f, point, d, g, p.lr);
      if (found === null) {
        current.status = "line-search-failed";
        current.note = "40 次 Armijo 回溯仍未找到可接受步长。";
        break;
      }
      alpha = found;
      effective = [alpha, alpha];
    }
    if (id === "coordinate") {
      coordinate = k % 2;
      d = [0, 0];
      d[coordinate] = -g[coordinate];
    }
    const next = add(point, scale(d, alpha));
    if (
      !next.every(Number.isFinite) ||
      Math.max(...next.map(Math.abs)) > 1e6 ||
      !Number.isFinite(f.value(next)) ||
      Math.abs(f.value(next)) > 1e16
    ) {
      current.status = "diverged";
      current.note = "下一步将超出数值保护范围，请减小学习率或更换起点。";
      break;
    }
    const result = evaluate(f, next);
    const sample: Sample = {
      k: k + 1,
      point: next,
      ...result,
      gradientNorm: norm(result.gradient),
      usedGradient: used,
      evaluationPoint: evalPoint,
      direction: d,
      alpha,
      stepLength: norm(sub(next, point)),
      velocity: [...velocity],
      firstMoment: [...m],
      secondMoment: [...v],
      correctedFirst: correctedM,
      correctedSecond: correctedV,
      effectiveRate: effective,
      inverseHessian: inv,
      approximation,
      batch,
      conjugateBeta: beta,
      coordinate,
      note,
      status: "running",
    };
    sample.status = terminalStatus(f, sample, p);
    history.push(sample);
    if (id === "bfgs" && result.differentiable)
      B = updateBfgs(B, sub(next, point), sub(result.gradient, g));
    lastG = [...g];
    lastD = [...d];
  }
  return { algorithm: id, params: p, history, status: history.at(-1)!.status };
}
