'use strict';
// Machine-learning algorithms implemented from scratch in plain JavaScript
// (no extra npm packages, so `docker compose up` keeps working offline):
//   1. Random Forest regressor  (bagged CART trees, histogram split search)
//   2. Ridge regression         (closed-form, one-hot + standardised features)
//   3. Lookup / heuristic baselines (the "old" approach, used for comparison)
const { makeRng } = require('./rng');

// ---------------------------------------------------------------- metrics
function evaluate(yTrue, yPred) {
  const n = yTrue.length;
  let ae = 0, se = 0, sum = 0;
  for (let i = 0; i < n; i++) { const e = yTrue[i] - yPred[i]; ae += Math.abs(e); se += e * e; sum += yTrue[i]; }
  const mean = sum / n;
  let tot = 0;
  for (let i = 0; i < n; i++) tot += (yTrue[i] - mean) ** 2;
  return {
    n,
    mae: +(ae / n).toFixed(3),
    rmse: +Math.sqrt(se / n).toFixed(3),
    r2: +(tot === 0 ? 0 : 1 - se / tot).toFixed(4),
  };
}

// ---------------------------------------------------------- random forest
function buildBins(X, p, maxBins = 48) {
  const cuts = [];
  const n = X.length;
  for (let f = 0; f < p; f++) {
    const vals = new Float64Array(n);
    for (let i = 0; i < n; i++) vals[i] = X[i][f];
    const sorted = Array.from(vals).sort((a, b) => a - b);
    const uniq = sorted.filter((v, i) => i === 0 || v !== sorted[i - 1]);
    let c = [];
    if (uniq.length <= maxBins) {
      for (let i = 0; i < uniq.length - 1; i++) c.push((uniq[i] + uniq[i + 1]) / 2);
    } else {
      for (let q = 1; q < maxBins; q++) {
        const v = sorted[Math.floor((q * n) / maxBins)];
        if (c.length === 0 || v > c[c.length - 1]) c.push(v);
      }
    }
    cuts.push(c);
  }
  const Xb = new Uint8Array(n * p);
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < p; f++) {
      const c = cuts[f]; const x = X[i][f];
      let lo = 0, hi = c.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (x <= c[m]) hi = m; else lo = m + 1; }
      Xb[i * p + f] = lo;
    }
  }
  return { cuts, Xb };
}

function growTree(Xb, cuts, y, p, idx0, params, rng, imp) {
  const T = { f: [], t: [], l: [], r: [], v: [] };
  const { maxDepth, minLeaf, mtry } = params;
  function node(idx, depth) {
    const id = T.f.length;
    T.f.push(-1); T.t.push(0); T.l.push(-1); T.r.push(-1);
    let sum = 0;
    for (let k = 0; k < idx.length; k++) sum += y[idx[k]];
    T.v.push(+(sum / idx.length).toFixed(4));
    if (depth >= maxDepth || idx.length < 2 * minLeaf) return id;
    const feats = [];
    const pool = Array.from({ length: p }, (_, i) => i);
    for (let k = 0; k < Math.min(mtry, p); k++) feats.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    let bestGain = 1e-9, bf = -1, bb = -1;
    const n = idx.length;
    for (const f of feats) {
      const nb = cuts[f].length + 1;
      if (nb < 2) continue;
      const hs = new Float64Array(nb), hc = new Float64Array(nb);
      for (let k = 0; k < n; k++) { const i = idx[k]; const b = Xb[i * p + f]; hs[b] += y[i]; hc[b]++; }
      let ls = 0, lc = 0;
      for (let b = 0; b < nb - 1; b++) {
        ls += hs[b]; lc += hc[b];
        const rc = n - lc;
        if (hc[b] === 0 || lc < minLeaf || rc < minLeaf) continue;
        const rs = sum - ls;
        const gain = (ls * ls) / lc + (rs * rs) / rc - (sum * sum) / n;
        if (gain > bestGain) { bestGain = gain; bf = f; bb = b; }
      }
    }
    if (bf < 0) return id;
    const left = [], right = [];
    for (let k = 0; k < n; k++) { const i = idx[k]; (Xb[i * p + bf] <= bb ? left : right).push(i); }
    imp[bf] += bestGain;
    T.f[id] = bf; T.t[id] = +cuts[bf][bb].toFixed(5);
    T.l[id] = node(left, depth + 1);
    T.r[id] = node(right, depth + 1);
    return id;
  }
  node(idx0, 0);
  return T;
}

function fitForest(X, y, opts = {}) {
  const { nTrees = 40, maxDepth = 10, minLeaf = 5, sampleFrac = 0.8, seed = 42 } = opts;
  const p = X[0].length; const n = X.length;
  const mtry = opts.mtry || Math.max(2, Math.ceil(p * 0.6));
  const rng = makeRng(seed);
  const { cuts, Xb } = buildBins(X, p);
  const imp = new Float64Array(p);
  const trees = [];
  const m = Math.floor(n * sampleFrac);
  for (let t = 0; t < nTrees; t++) {
    const idx = new Array(m);
    for (let i = 0; i < m; i++) idx[i] = Math.floor(rng() * n); // bootstrap sample
    trees.push(growTree(Xb, cuts, y, p, idx, { maxDepth, minLeaf, mtry }, rng, imp));
  }
  const tot = imp.reduce((a, b) => a + b, 0) || 1;
  return { type: 'random_forest', params: { nTrees, maxDepth, minLeaf, mtry, sampleFrac }, importances: Array.from(imp, (v) => +(v / tot).toFixed(4)), trees };
}

function predictTree(T, row) {
  let i = 0;
  while (T.f[i] >= 0) i = row[T.f[i]] <= T.t[i] ? T.l[i] : T.r[i];
  return T.v[i];
}

// ------------------------------------------------------------------ ridge
function expandRow(model, row) {
  const out = [1];
  model.numeric.forEach((fi, k) => out.push((row[fi] - model.mean[k]) / model.std[k]));
  for (const c of model.categorical) for (const v of c.values) out.push(row[c.index] === v ? 1 : 0);
  return out;
}

function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

function fitRidge(X, y, featureNames, categoricalSpec, lambda = 1.0) {
  const catNames = Object.keys(categoricalSpec);
  const categorical = catNames.map((nm) => ({ name: nm, index: featureNames.indexOf(nm), values: categoricalSpec[nm] }));
  const catIdx = new Set(categorical.map((c) => c.index));
  const numeric = featureNames.map((_, i) => i).filter((i) => !catIdx.has(i));
  const n = X.length;
  const mean = numeric.map((fi) => X.reduce((s, r) => s + r[fi], 0) / n);
  const std = numeric.map((fi, k) => Math.sqrt(X.reduce((s, r) => s + (r[fi] - mean[k]) ** 2, 0) / n) || 1);
  const model = { type: 'ridge', lambda, numeric, mean, std, categorical };
  const D = expandRow(model, X[0]).length;
  const A = Array.from({ length: D }, () => new Array(D).fill(0));
  const b = new Array(D).fill(0);
  for (let i = 0; i < n; i++) {
    const z = expandRow(model, X[i]);
    for (let r = 0; r < D; r++) { if (z[r] === 0) continue; b[r] += z[r] * y[i]; for (let c = 0; c < D; c++) A[r][c] += z[r] * z[c]; }
  }
  for (let d = 1; d < D; d++) A[d][d] += lambda; // intercept (d=0) is not penalised
  A[0][0] += 1e-8;
  model.weights = solve(A, b).map((w) => +w.toFixed(6));
  return model;
}

// ------------------------------------------------------------- baselines
// crowd baseline: historical average of the same weekday + hour (the old approach)
function fitCrowdBaseline(X, y, F) {
  const hi = F.indexOf('hour'), di = F.indexOf('dow');
  const sums = {}, cnt = {}; let tot = 0;
  X.forEach((r, i) => { const k = `${r[di]}|${r[hi]}`; sums[k] = (sums[k] || 0) + y[i]; cnt[k] = (cnt[k] || 0) + 1; tot += y[i]; });
  const table = {}; Object.keys(sums).forEach((k) => { table[k] = +(sums[k] / cnt[k]).toFixed(3); });
  return { type: 'baseline_weekday_hour', hi, di, table, fallback: tot / X.length };
}
// demand baseline: item's average units/day x weekday ratio (the old approach)
function fitDemandBaseline(X, y, F) {
  const pi = F.indexOf('item_popularity'), di = F.indexOf('dow');
  const s = {}, c = {}; let tot = 0;
  X.forEach((r, i) => { s[r[di]] = (s[r[di]] || 0) + y[i]; c[r[di]] = (c[r[di]] || 0) + 1; tot += y[i]; });
  const avg = tot / X.length; const ratio = {};
  Object.keys(s).forEach((d) => { ratio[d] = +(s[d] / c[d] / avg).toFixed(4); });
  return { type: 'baseline_item_weekday', pi, di, ratio };
}
// wait-time baseline: the original hand-written rule  (orders ahead x 3 min + prep time)
function waitBaseline(F) {
  return { type: 'baseline_rule', ai: F.indexOf('orders_ahead'), pi: F.indexOf('max_prep_min') };
}

// ------------------------------------------------------------- predict
function predict(model, row) {
  switch (model.type) {
    case 'random_forest': {
      let s = 0;
      for (const T of model.trees) s += predictTree(T, row);
      return s / model.trees.length;
    }
    case 'ridge': {
      const z = expandRow(model, row);
      let s = 0;
      for (let i = 0; i < z.length; i++) s += z[i] * model.weights[i];
      return s;
    }
    case 'baseline_weekday_hour': { const v = model.table[`${row[model.di]}|${row[model.hi]}`]; return v == null ? model.fallback : v; }
    case 'baseline_item_weekday': return row[model.pi] * (model.ratio[row[model.di]] ?? 1);
    case 'baseline_rule': return row[model.ai] * 3 + row[model.pi];
    default: throw new Error(`Unknown model type ${model.type}`);
  }
}

module.exports = { evaluate, fitForest, fitRidge, fitCrowdBaseline, fitDemandBaseline, waitBaseline, predict };
