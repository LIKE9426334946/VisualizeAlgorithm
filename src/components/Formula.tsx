import { memo, useMemo } from "react";
import katex from "katex";
export const fmt = (value: number, digits = 4) =>
  !Number.isFinite(value)
    ? "—"
    : value === 0
      ? "0"
      : Math.abs(value) < 0.0001 || Math.abs(value) >= 100000
        ? value.toExponential(2)
        : Number(value.toFixed(digits)).toString();
export const texNumber = (v: number) =>
  !Number.isFinite(v)
    ? "\\text{未定义}"
    : fmt(v).replace(/e([+-]?\d+)/, "\\times 10^{$1}");
export const vecTex = (v: number[]) =>
  `\\begin{bmatrix}${v.map(texNumber).join("\\\\")}\\end{bmatrix}`;
export const matTex = (m: number[][]) =>
  `\\begin{bmatrix}${m.map((r) => r.map(texNumber).join("&")).join("\\\\")}\\end{bmatrix}`;
export const Formula = memo(function Formula({
  tex,
  block = false,
  className = "",
}: {
  tex: string;
  block?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
        strict: "ignore",
        trust: false,
      }),
    [tex, block],
  );
  return (
    <div
      className={`formula ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
