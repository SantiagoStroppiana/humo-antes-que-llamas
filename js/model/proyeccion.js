"use strict";
// Proyección 2026–2040 a partir de la tendencia climática medida. Sin DOM.
function linreg(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const b = sxy / sxx; return { a: my - b * mx, b };
}
const RISK_FIT = linreg(CLIMATE.map(r => r[0]), CLIMATE.map(r => r[4]));

// proyección 2026-2040: los focos crecen como la tendencia medida de días de peligro
const FOREST0 = 150000, Y0 = 2026, Y1 = 2040;
function climateGrowth(y) { return (RISK_FIT.a + RISK_FIT.b * y) / (RISK_FIT.a + RISK_FIT.b * Y0); }
function project(meanNo, meanAi, focos0) {
  const rows = []; let cNo = 0, cAi = 0;
  for (let y = Y0; y <= Y1; y++) {
    const f = focos0 * climateGrowth(y);
    cNo = Math.min(FOREST0, cNo + f * meanNo);
    cAi = Math.min(FOREST0, cAi + f * meanAi);
    rows.push({ year: y, focos: f, no: cNo, ai: cAi });
  }
  return rows;
}
