export type Vec2 = [number, number];
export type Mat2 = [Vec2, Vec2];
export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
export const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];
export const norm = (a: Vec2) => Math.hypot(...a);
export const mv = (a: Mat2, v: Vec2): Vec2 => [dot(a[0], v), dot(a[1], v)];
export const identity = (): Mat2 => [
  [1, 0],
  [0, 1],
];
export function inverse(a: Mat2): Mat2 | null {
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  const size = Math.max(...a.flat().map(Math.abs));
  if (
    !Number.isFinite(det) ||
    size === 0 ||
    Math.abs(det) <= 1e-12 * size * size
  )
    return null;
  return [
    [a[1][1] / det, -a[0][1] / det],
    [-a[1][0] / det, a[0][0] / det],
  ];
}
export function eigenvalues(a: Mat2): Vec2 {
  const center = (a[0][0] + a[1][1]) / 2;
  const radius = Math.hypot((a[0][0] - a[1][1]) / 2, a[0][1]);
  return [center - radius, center + radius];
}
// Second-order forward automatic differentiation, with the exact chain rule.
export class Jet {
  constructor(
    public value: number,
    public g: Vec2 = [0, 0],
    public h: Mat2 = [
      [0, 0],
      [0, 0],
    ],
  ) {}
  static x(v: number) {
    return new Jet(v, [1, 0]);
  }
  static y(v: number) {
    return new Jet(v, [0, 1]);
  }
  add(other: Jet | number): Jet {
    const b = typeof other === "number" ? new Jet(other) : other;
    return new Jet(
      this.value + b.value,
      add(this.g, b.g),
      this.h.map((row, i) => row.map((v, j) => v + b.h[i][j])) as Mat2,
    );
  }
  mul(other: Jet | number): Jet {
    const b = typeof other === "number" ? new Jet(other) : other;
    return new Jet(
      this.value * b.value,
      add(scale(this.g, b.value), scale(b.g, this.value)),
      this.h.map((row, i) =>
        row.map(
          (v, j) =>
            v * b.value +
            this.value * b.h[i][j] +
            this.g[i] * b.g[j] +
            b.g[i] * this.g[j],
        ),
      ) as Mat2,
    );
  }
  chain(v: number, first: number, second: number): Jet {
    return new Jet(
      v,
      scale(this.g, first),
      this.h.map((row, i) =>
        row.map((a, j) => a * first + this.g[i] * this.g[j] * second),
      ) as Mat2,
    );
  }
  pow(n: number): Jet {
    if (n === 0) return new Jet(1);
    if (n === 1) return this;
    return this.chain(
      this.value ** n,
      n * this.value ** (n - 1),
      n * (n - 1) * this.value ** (n - 2),
    );
  }
  exp(): Jet {
    const e = Math.exp(this.value);
    return this.chain(e, e, e);
  }
  cos(): Jet {
    return this.chain(
      Math.cos(this.value),
      -Math.sin(this.value),
      -Math.cos(this.value),
    );
  }
}
