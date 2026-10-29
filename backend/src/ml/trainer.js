'use strict';
// Trains, evaluates and selects the best model for each of the 3 ML tasks:
//   crowd  -> orders per hour           (Random Forest vs Ridge vs weekday-average baseline)
//   demand -> units sold per item/day   (Random Forest vs Ridge vs item-average baseline)
//   wait   -> order wait time (minutes) (Random Forest vs Ridge vs hand-written rule)
const fs = require('fs');
const path = require('path');
const { makeRng } = require('./rng');
const { readCsv } = require('./csv');
const { generateAll, DATA_DIR } = require('./dataset');
const F = require('./features');
const A = require('./algorithms');

const STORE_FILE = path.join(__dirname, 'models', 'model_store.json');
const RF_PARAMS = {
  crowd: { nTrees: 60, maxDepth: 9, minLeaf: 6, seed: 11 },
  demand: { nTrees: 50, maxDepth: 11, minLeaf: 8, seed: 12 },
  wait: { nTrees: 60, maxDepth: 10, minLeaf: 8, seed: 13 },
};
const TITLES = {
  crowd: { title: 'Crowd prediction', target: 'orders per hour', unit: 'orders' },
  demand: { title: 'Demand forecast', target: 'units sold per item per day', unit: 'units' },
  wait: { title: 'Wait-time prediction', target: 'order wait time', unit: 'minutes' },
};

function ensureDatasets() {
  const need = ['hourly_orders', 'daily_item_sales', 'order_wait_times'];
  if (need.some((n) => !fs.existsSync(path.join(DATA_DIR, `${n}.csv`)))) generateAll();
}
function loadDatasets() {
  ensureDatasets();
  return {
    hourly: readCsv(path.join(DATA_DIR, 'hourly_orders.csv')),
    demand: readCsv(path.join(DATA_DIR, 'daily_item_sales.csv')),
    wait: readCsv(path.join(DATA_DIR, 'order_wait_times.csv')),
  };
}

// hold out 20% of whole DAYS (never split a day) so there is no same-day leakage
function daySplit(rows, seed) {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const rng = makeRng(seed);
  const test = new Set(rng.shuffle(dates.slice()).slice(0, Math.round(dates.length * 0.2)));
  return { train: rows.filter((r) => !test.has(r.date)), test: rows.filter((r) => test.has(r.date)), testDays: test.size, trainDays: dates.length - test.size };
}
function randomSplit(rows, seed) {
  const idx = makeRng(seed).shuffle(rows.map((_, i) => i));
  const cut = Math.round(rows.length * 0.8);
  const set = new Set(idx.slice(0, cut));
  return { train: rows.filter((_, i) => set.has(i)), test: rows.filter((_, i) => !set.has(i)) };
}

function buildMeta(trainRows) {
  const s = {}, c = {}, cs = {}, cc = {}; let tot = 0;
  for (const r of trainRows) {
    s[r.item_name] = (s[r.item_name] || 0) + r.qty; c[r.item_name] = (c[r.item_name] || 0) + 1;
    cs[r.category_slug] = (cs[r.category_slug] || 0) + r.qty; cc[r.category_slug] = (cc[r.category_slug] || 0) + 1; tot += r.qty;
  }
  const r2 = (v) => +v.toFixed(3);
  return {
    categories: F.CATEGORY_SLUGS,
    item_pop: Object.fromEntries(Object.keys(s).map((k) => [k, r2(s[k] / c[k])])),
    category_pop: Object.fromEntries(Object.keys(cs).map((k) => [k, r2(cs[k] / cc[k])])),
    global_pop: r2(tot / trainRows.length),
  };
}

function runTask(key, split, rowFn, targetFn, extra = {}) {
  const feats = F.FEATURES[key];
  const toXY = (rows) => ({ X: rows.map(rowFn), y: rows.map(targetFn) });
  const tr = toXY(split.train), te = toXY(split.test);
  const all = { X: tr.X.concat(te.X), y: tr.y.concat(te.y) };

  const baseline = key === 'crowd' ? A.fitCrowdBaseline(tr.X, tr.y, feats) : key === 'demand' ? A.fitDemandBaseline(tr.X, tr.y, feats) : A.waitBaseline(feats);
  const ridge = A.fitRidge(tr.X, tr.y, feats, F.CATEGORICAL[key], 3.0);
  const rf = A.fitForest(tr.X, tr.y, RF_PARAMS[key]);

  const score = (m) => A.evaluate(te.y, te.X.map((r) => Math.max(0, A.predict(m, r))));
  const results = {
    baseline: { name: key === 'crowd' ? 'Weekday-hour average (old method)' : key === 'demand' ? 'Item average × weekday (old method)' : 'Rule: 3 min × orders ahead + prep (old method)', ...score(baseline) },
    ridge: { name: 'Ridge Regression', ...score(ridge) },
    random_forest: { name: 'Random Forest', ...score(rf) },
  };
  const selected = Object.keys(results).reduce((b, k) => (results[k].rmse < results[b].rmse ? k : b));

  // production model = best algorithm re-fitted on ALL available rows
  let finalModel;
  if (selected === 'random_forest') finalModel = A.fitForest(all.X, all.y, RF_PARAMS[key]);
  else if (selected === 'ridge') finalModel = A.fitRidge(all.X, all.y, feats, F.CATEGORICAL[key], 3.0);
  else finalModel = baseline;

  const importances = (selected === 'random_forest' ? finalModel : rf).importances;
  return {
    ...TITLES[key], features: feats, selected, results,
    improvement_vs_baseline_pct: +(((results.baseline.rmse - results[selected].rmse) / results.baseline.rmse) * 100).toFixed(1),
    importances: feats.map((f, i) => ({ feature: f, importance: importances[i] })).sort((a, b) => b.importance - a.importance),
    rows: all.y.length, train_rows: tr.y.length, test_rows: te.y.length,
    rf_params: RF_PARAMS[key], model: finalModel, ...extra,
  };
}

function train({ realData = null } = {}) {
  const t0 = Date.now();
  const ds = loadDatasets();
  const hourly = ds.hourly.concat(realData?.hourly || []);
  const demand = ds.demand.concat(realData?.demand || []);

  const s1 = daySplit(hourly, 101);
  const crowd = runTask('crowd', s1, F.crowdRow, (r) => r.orders, { split: `${s1.trainDays} train days / ${s1.testDays} held-out days` });

  const s2 = daySplit(demand, 202);
  const meta = buildMeta(s2.train);
  const demandTask = runTask('demand', s2, (r) => F.demandRow(r, meta), (r) => r.qty, { split: `${s2.trainDays} train days / ${s2.testDays} held-out days`, meta });

  const s3 = randomSplit(ds.wait, 303);
  const wait = runTask('wait', s3, F.waitRow, (r) => r.wait_minutes, { split: '80% / 20% random split' });

  return {
    version: 1,
    trained_at: new Date().toISOString(),
    training_seconds: +((Date.now() - t0) / 1000).toFixed(1),
    data_sources: {
      synthetic_rows: { hourly_orders: ds.hourly.length, daily_item_sales: ds.demand.length, order_wait_times: ds.wait.length },
      live_rows: { hourly_orders: realData?.hourly?.length || 0, daily_item_sales: realData?.demand?.length || 0 },
    },
    tasks: { crowd, demand: demandTask, wait },
  };
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store));
}
function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch (e) { return null; }
}

module.exports = { train, saveStore, loadStore, loadDatasets, STORE_FILE };
