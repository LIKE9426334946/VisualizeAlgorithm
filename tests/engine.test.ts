import test from "node:test";
import assert from "node:assert/strict";
import {
  algorithms,
  defaults,
  simulate,
  sampleGradient,
} from "../src/engine/algorithms";
import {
  objectives,
  objectiveById,
  evaluate,
  type Objective,
} from "../src/engine/objectives";
import {
  add,
  scale,
  inverse,
  eigenvalues,
  norm,
  type Vec2,
} from "../src/engine/math";
const near = (a: number, b: number, tol = 1e-7) =>
  assert.ok(
    Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)),
    `${a} != ${b}`,
  );
const vecNear = (a: Vec2, b: Vec2, tol = 1e-7) =>
  a.forEach((v, i) => near(v, b[i], tol));
const quadratic = objectiveById("quadratic");
test("all nine objective values and first/second derivatives agree with finite differences", () => {
  for (const f of objectives) {
    const p: Vec2 = [0.71, -0.43],
      e = evaluate(f, p);
    near(e.value, f.value(p));
    for (let i = 0; i < 2; i++) {
      const h = 1e-5,
        a: Vec2 = [...p],
        b: Vec2 = [...p];
      a[i] += h;
      b[i] -= h;
      near(e.gradient[i], (f.value(a) - f.value(b)) / (2 * h), 2e-6);
      const ga = evaluate(f, a).gradient,
        gb = evaluate(f, b).gradient;
      for (let j = 0; j < 2; j++)
        near(e.hessian[j][i], (ga[j] - gb[j]) / (2 * h), 5e-6);
    }
  }
});
test("reference minimizers have value zero, and quadratic Hessian is exact", () => {
  for (const f of objectives)
    for (const p of f.minima) near(f.value(p), 0, 1e-9);
  assert.deepEqual(evaluate(quadratic, [2, 3]).hessian, [
    [3, 1],
    [1, 1],
  ]);
});
test("GD, Momentum, Nesterov and coordinate updates use their stated formulas", () => {
  const p = { ...defaults("gd", "quadratic"), iterations: 3, threshold: 1e-12 },
    start: Vec2 = [-3, 2.5],
    g = evaluate(quadratic, start).gradient;
  const gd = simulate(quadratic, "gd", p, start);
  vecNear(gd.history[1].point, add(start, scale(g, -p.lr)));
  const mom = simulate(quadratic, "momentum", p, start);
  vecNear(
    mom.history[2].velocity,
    add(
      scale(mom.history[1].velocity, p.momentum),
      scale(mom.history[1].gradient, -p.lr),
    ),
  );
  const nag = simulate(quadratic, "nesterov", p, start),
    look = add(
      nag.history[1].point,
      scale(nag.history[1].velocity, p.momentum),
    );
  vecNear(nag.history[2].evaluationPoint, look);
  vecNear(nag.history[2].usedGradient, evaluate(quadratic, look).gradient);
  const cd = simulate(quadratic, "coordinate", p, start);
  near(cd.history[1].point[1], start[1]);
  near(cd.history[2].point[0], cd.history[1].point[0]);
});
test("Adam corrects both moments and adaptive methods scale each coordinate", () => {
  for (const id of ["adam", "adagrad", "rmsprop"] as const) {
    const p = { ...defaults(id, "quadratic"), iterations: 2 },
      run = simulate(quadratic, id, p, [-3, 2.5]),
      s = run.history[1],
      g = run.history[0].gradient;
    for (let j = 0; j < 2; j++) {
      const expectedV = id === "rmsprop" ? (1 - p.beta) * g[j] ** 2 : g[j] ** 2;
      if (id === "adam") {
        near(s.correctedFirst[j], g[j]);
        near(s.correctedSecond[j], g[j] ** 2);
      }
      near(
        s.point[j],
        run.history[0].point[j] -
          (p.lr * g[j]) / (Math.sqrt(expectedV) + p.epsilon),
      );
    }
  }
});
test("Newton solves the positive definite quadratic in one full step", () => {
  const run = simulate(
    quadratic,
    "newton",
    defaults("newton", "quadratic"),
    [-3, 2.5],
  );
  assert.equal(run.history.length, 2);
  vecNear(run.history[1].point, [0, 0]);
  assert.equal(run.status, "stationary");
  assert.ok(run.history[1].inverseHessian);
});
test("all twelve algorithms produce finite histories with correct recorded loss and displacement", () => {
  for (const a of algorithms) {
    const r = simulate(quadratic, a.id, defaults(a.id, "quadratic"), [-3, 2.5]);
    assert.ok(r.history.length > 1, a.id);
    for (const s of r.history) {
      assert.ok(Number.isFinite(s.value), a.id);
      near(s.value, quadratic.value(s.point));
      if (s.k) {
        const prev = r.history[s.k - 1];
        near(
          s.stepLength,
          Math.hypot(s.point[0] - prev.point[0], s.point[1] - prev.point[1]),
        );
        vecNear(s.point, add(prev.point, scale(s.direction, s.alpha)));
      }
    }
  }
});
test("BFGS and nonlinear CG use Armijo descent; BFGS approximations remain positive definite", () => {
  for (const id of ["bfgs", "cg"] as const) {
    const r = simulate(
      objectiveById("rosenbrock"),
      id,
      defaults(id, "rosenbrock"),
      [-1.2, 1],
    );
    for (let k = 1; k < r.history.length; k++) {
      assert.ok(r.history[k].value <= r.history[k - 1].value + 1e-10);
      assert.ok(r.history[k].alpha > 0);
      if (id === "bfgs")
        assert.ok(eigenvalues(r.history[k].approximation)[0] > 0);
    }
  }
  const r = simulate(
    quadratic,
    "bfgs",
    defaults("bfgs", "quadratic"),
    [-3, 2.5],
  );
  assert.ok(r.history.at(-1)!.value < 1e-8);
});
test("SGD samples are deterministic, without replacement, unbiased across complete finite sum", () => {
  const g: Vec2 = [4, 2];
  assert.deepEqual(sampleGradient(g, 16, 42), sampleGradient(g, 16, 42));
  const s = sampleGradient(g, 16, 42);
  assert.equal(new Set(s.indices).size, 16);
  vecNear(sampleGradient(g, 64, 123).gradient, g);
  const p = { ...defaults("gd", "quadratic"), batchSize: 64, iterations: 30 };
  assert.deepEqual(
    simulate(quadratic, "gd", p, [-3, 2.5]).history.map((s) => s.point),
    simulate(quadratic, "minibatch", p, [-3, 2.5]).history.map((s) => s.point),
  );
});
test("stopping guards distinguish saddle, singular Hessian, unbounded trajectories and Ackley cusp", () => {
  const saddle = objectiveById("saddle");
  const r = simulate(saddle, "newton", defaults("newton", "saddle"), [-2, 1]);
  assert.equal(r.status, "stationary");
  assert.ok(eigenvalues(r.history.at(-1)!.hessian)[0] < 0);
  const divergent = simulate(
    saddle,
    "gd",
    { ...defaults("gd", "saddle"), lr: 10 },
    [-2, 1],
  );
  assert.equal(divergent.status, "diverged");
  assert.ok(divergent.history.every((s) => Number.isFinite(s.value)));
  const ackley = simulate(
    objectiveById("ackley"),
    "newton",
    defaults("newton", "ackley"),
    [0, 0],
  );
  assert.equal(ackley.status, "minimum");
  assert.equal(ackley.history[0].differentiable, false);
  const singular: Objective = {
    ...quadratic,
    value: ([x]) => x * x,
    jet: (x) => x.pow(2),
  };
  assert.equal(
    simulate(singular, "newton", defaults("newton", "quadratic"), [1, 1])
      .status,
    "singular",
  );
  assert.equal(
    inverse([
      [1, 2],
      [2, 4],
    ]),
    null,
  );
});
test("a zero partial derivative does not prematurely stop coordinate descent", () => {
  const f = objectiveById("sphere"),
    r = simulate(
      f,
      "coordinate",
      { ...defaults("coordinate", "sphere"), iterations: 3 },
      [0, 2],
    );
  assert.equal(r.history[1].stepLength, 0);
  assert.equal(r.history[1].status, "running");
  assert.ok(r.history[2].value < r.history[1].value);
});
test("every function / algorithm combination is bounded in time and does not expose nonfinite points", () => {
  for (const f of objectives)
    for (const a of algorithms) {
      const r = simulate(
        f,
        a.id,
        { ...defaults(a.id, f.id), iterations: 60 },
        f.start,
      );
      assert.ok(r.history.length <= 61);
      assert.ok(r.history.every((s) => s.point.every(Number.isFinite)));
      assert.notEqual(r.status, "running");
    }
});
