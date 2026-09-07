import { Jet, type Vec2, type Mat2 } from "./math";
export type ObjectiveId =
  | "quadratic"
  | "rosenbrock"
  | "himmelblau"
  | "booth"
  | "beale"
  | "sphere"
  | "ackley"
  | "rastrigin"
  | "saddle";
export interface Evaluation {
  value: number;
  gradient: Vec2;
  hessian: Mat2;
  differentiable: boolean;
}
export interface Objective {
  id: ObjectiveId;
  name: string;
  chinese: string;
  formula: string;
  description: string;
  domain: [number, number, number, number];
  start: Vec2;
  minima: Vec2[];
  value: (p: Vec2) => number;
  jet: (x: Jet, y: Jet) => Jet;
}
const tau = 2 * Math.PI;
export const objectives: Objective[] = [
  {
    id: "quadratic",
    name: "Quadratic",
    chinese: "二次函数",
    formula: "f(x,y)=\\frac12(3x^2+2xy+y^2)",
    description: "一个倾斜的碗形曲面。观察不同方向的曲率如何影响下降速度。",
    domain: [-4.5, 4.5, -4.5, 4.5],
    start: [-3, 2.5],
    minima: [[0, 0]],
    value: ([x, y]) => (3 * x * x + 2 * x * y + y * y) / 2,
    jet: (x, y) => x.pow(2).mul(3).add(x.mul(y).mul(2)).add(y.pow(2)).mul(0.5),
  },
  {
    id: "rosenbrock",
    name: "Rosenbrock",
    chinese: "香蕉函数",
    formula: "f(x,y)=(1-x)^2+100(y-x^2)^2",
    description: "狭长弯曲的谷底让梯度下降容易来回震荡。最小值在 (1, 1)。",
    domain: [-2.5, 2.5, -1.5, 3.5],
    start: [-1.2, 1],
    minima: [[1, 1]],
    value: ([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    jet: (x, y) =>
      x
        .mul(-1)
        .add(1)
        .pow(2)
        .add(y.add(x.pow(2).mul(-1)).pow(2).mul(100)),
  },
  {
    id: "himmelblau",
    name: "Himmelblau",
    chinese: "四个极小值",
    formula: "f(x,y)=(x^2+y-11)^2+(x+y^2-7)^2",
    description: "四个全局最小值。改变起点，看看算法最终会到达哪一个。",
    domain: [-5, 5, -5, 5],
    start: [-0.5, -1],
    minima: [
      [3, 2],
      [-2.805118, 3.131312],
      [-3.77931, -3.283186],
      [3.584428, -1.848126],
    ],
    value: ([x, y]) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    jet: (x, y) =>
      x
        .pow(2)
        .add(y)
        .add(-11)
        .pow(2)
        .add(x.add(y.pow(2)).add(-7).pow(2)),
  },
  {
    id: "booth",
    name: "Booth",
    chinese: "倾斜椭圆谷底",
    formula: "f(x,y)=(x+2y-7)^2+(2x+y-5)^2",
    description: "二次函数的长窄谷底，适合比较动量与普通梯度下降。",
    domain: [-5, 5, -3, 7],
    start: [-3, -2],
    minima: [[1, 3]],
    value: ([x, y]) => (x + 2 * y - 7) ** 2 + (2 * x + y - 5) ** 2,
    jet: (x, y) =>
      x.add(y.mul(2)).add(-7).pow(2).add(x.mul(2).add(y).add(-5).pow(2)),
  },
  {
    id: "beale",
    name: "Beale",
    chinese: "非凸多项式",
    formula: "f(x,y)=\\sum_{i=1}^{3}(c_i-x+xy^i)^2,\\quad c=(1.5,2.25,2.625)",
    description: "边缘陡峭、谷底平缓。较小的学习率有助于避免越过谷底。",
    domain: [-4, 4, -3, 3],
    start: [1, 1],
    minima: [[3, 0.5]],
    value: ([x, y]) =>
      [1.5, 2.25, 2.625].reduce(
        (a, c, i) => a + (c - x + x * y ** (i + 1)) ** 2,
        0,
      ),
    jet: (x, y) =>
      [1.5, 2.25, 2.625].reduce(
        (a, c, i) =>
          a.add(
            x
              .mul(-1)
              .add(x.mul(y.pow(i + 1)))
              .add(c)
              .pow(2),
          ),
        new Jet(0),
      ),
  },
  {
    id: "sphere",
    name: "Sphere",
    chinese: "球面函数",
    formula: "f(x,y)=x^2+y^2",
    description: "各个方向的曲率相同。最直接地观察梯度指向与收敛。",
    domain: [-5, 5, -5, 5],
    start: [-3.5, 3],
    minima: [[0, 0]],
    value: ([x, y]) => x * x + y * y,
    jet: (x, y) => x.pow(2).add(y.pow(2)),
  },
  {
    id: "ackley",
    name: "Ackley",
    chinese: "多峰函数",
    formula:
      "f=-20e^{-0.2\\sqrt{(x^2+y^2)/2}}-e^{(\\cos 2\\pi x+\\cos 2\\pi y)/2}+20+e",
    description:
      "起伏的局部极小值围绕中心。原点是不可微的全局最小值，不能在此套用 Hessian。",
    domain: [-5, 5, -5, 5],
    start: [-2.7, 2.4],
    minima: [[0, 0]],
    value: ([x, y]) =>
      -20 * Math.exp(-0.2 * Math.sqrt((x * x + y * y) / 2)) -
      Math.exp((Math.cos(tau * x) + Math.cos(tau * y)) / 2) +
      20 +
      Math.E,
    jet: (x, y) =>
      x
        .pow(2)
        .add(y.pow(2))
        .mul(0.5)
        .pow(0.5)
        .mul(-0.2)
        .exp()
        .mul(-20)
        .add(x.mul(tau).cos().add(y.mul(tau).cos()).mul(0.5).exp().mul(-1))
        .add(20 + Math.E),
  },
  {
    id: "rastrigin",
    name: "Rastrigin",
    chinese: "周期多峰函数",
    formula: "f(x,y)=20+x^2+y^2-10(\\cos 2\\pi x+\\cos 2\\pi y)",
    description:
      "许多局部极小值考验算法的起点与步长。梯度小并不代表找到全局最优。",
    domain: [-5.12, 5.12, -5.12, 5.12],
    start: [-3.2, 2.8],
    minima: [[0, 0]],
    value: ([x, y]) =>
      20 + x * x + y * y - 10 * (Math.cos(tau * x) + Math.cos(tau * y)),
    jet: (x, y) =>
      x
        .pow(2)
        .add(y.pow(2))
        .add(x.mul(tau).cos().add(y.mul(tau).cos()).mul(-10))
        .add(20),
  },
  {
    id: "saddle",
    name: "Saddle",
    chinese: "鞍点函数",
    formula: "f(x,y)=x^2-y^2",
    description:
      "原点是鞍点而非最小值；函数向下无界。观察纯 Newton 方向为何可能指向鞍点。",
    domain: [-4, 4, -4, 4],
    start: [-2, 1],
    minima: [],
    value: ([x, y]) => x * x - y * y,
    jet: (x, y) => x.pow(2).add(y.pow(2).mul(-1)),
  },
];
export const objectiveById = (id: ObjectiveId) =>
  objectives.find((f) => f.id === id)!;
export function evaluate(f: Objective, p: Vec2): Evaluation {
  if (f.id === "ackley" && Math.hypot(...p) < 1e-12)
    return {
      value: f.value(p),
      gradient: [NaN, NaN],
      hessian: [
        [NaN, NaN],
        [NaN, NaN],
      ],
      differentiable: false,
    };
  const j = f.jet(Jet.x(p[0]), Jet.y(p[1]));
  return { value: j.value, gradient: j.g, hessian: j.h, differentiable: true };
}
