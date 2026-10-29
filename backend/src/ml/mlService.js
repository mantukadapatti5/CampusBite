'use strict';
// Prediction service: loads the trained models (ml/models/model_store.json)
// and exposes simple functions used by the controllers / analytics / wait-time
// estimator. If no model file exists yet it generates the dataset and trains
// automatically on first use.
const path = require('path');
const F = require('./features');
const A = require('./algorithms');
const { train, saveStore, loadStore } = require('./trainer');
const { DATA_DIR } = require('./dataset');

let store = null;
let training = false;

function ensureReady() {
  if (store) return store;
  store = loadStore();
  if (!store) { store = train(); saveStore(store); console.log('[ml] No saved models found - trained fresh models.'); }
  return store;
}
function init() {
  try { const s = ensureReady(); console.log(`[ml] Models ready (trained ${s.trained_at}).`); } catch (e) { console.error('[ml] init failed:', e.message); }
}

const task = (k) => ensureReady().tasks[k];
const clampNum = (v, lo = 0) => Math.max(lo, v);
const r1 = (v) => Math.round(v * 10) / 10;

function resolveDate(dateStr) {
  const ok = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const date = ok ? dateStr : F.dateInTz();
  return { date, ...F.dateParts(date) };
}
const ctxOf = (c = {}) => ({ holiday: c.holiday ? 1 : 0, exam: c.exam ? 1 : 0, rain: c.rain ? 1 : 0 });

// ---------------------------------------------------------------- crowd
function predictCrowd(dateStr, context = {}) {
  const t = task('crowd'); const ctx = ctxOf(context);
  const d = resolveDate(dateStr);
  const rmse = t.results[t.selected].rmse;
  const hours = F.HOURS.map((hour) => {
    const row = F.crowdRow({ hour, dow: d.dow, is_holiday: ctx.holiday, is_exam: ctx.exam, rain: ctx.rain, month: d.month });
    const p = clampNum(A.predict(t.model, row));
    return { hour, label: `${String(hour).padStart(2, '0')}:00`, predicted_orders: Math.round(p), low: Math.round(clampNum(p - rmse)), high: Math.round(p + rmse) };
  });
  const max = Math.max(...hours.map((h) => h.predicted_orders), 1);
  hours.forEach((h) => { h.level = h.predicted_orders / max > 0.7 ? 'high' : h.predicted_orders / max > 0.35 ? 'medium' : 'low'; });
  const peak = hours.reduce((b, h) => (h.predicted_orders > b.predicted_orders ? h : b), hours[0]);
  const SLOTS_PER_HOUR = 6; // pickup slots are 10 minutes long
  return {
    date: d.date, dow: d.dow, context: ctx, model: t.selected, model_name: t.results[t.selected].name,
    error_rmse: rmse, hours, total_orders: hours.reduce((s, h) => s + h.predicted_orders, 0),
    peak_hour: peak.hour, peak_label: peak.label, peak_orders: peak.predicted_orders,
    suggested_slot_capacity: Math.max(1, Math.ceil((peak.predicted_orders / SLOTS_PER_HOUR) * 1.2)),
  };
}

// --------------------------------------------------------------- demand
// items: [{ id, name, category_slug, price, is_veg, stock_quantity, is_available }]
function predictDemand(items, dateStr, context = {}, tempOverride = null) {
  const t = task('demand'); const ctx = ctxOf(context);
  const d = resolveDate(dateStr);
  const temp = tempOverride != null ? Number(tempOverride) : F.monthTemp(d.month) - (ctx.rain ? 2 : 0);
  const rmse = t.results[t.selected].rmse;
  const rows = items.map((it) => {
    const row = F.demandRow({ item_name: it.name, category_slug: it.category_slug, price: it.price, is_veg: it.is_veg, dow: d.dow, is_holiday: ctx.holiday, is_exam: ctx.exam, rain: ctx.rain, temp_c: temp, month: d.month }, t.meta);
    const p = clampNum(A.predict(t.model, row));
    const suggested = Math.ceil(p + 0.25 * rmse); // small safety buffer
    const stock = it.stock_quantity == null ? null : Number(it.stock_quantity);
    let status = 'ok';
    if (it.is_available === false) status = 'unavailable';
    else if (stock != null && stock < p) status = 'restock';
    else if (stock != null && stock < suggested) status = 'tight';
    return {
      menu_item_id: it.id, name: it.name, category: it.category_slug,
      predicted_quantity: r1(p), low: Math.round(clampNum(p - rmse)), high: Math.round(p + rmse),
      suggested_quantity: suggested, stock, shortfall: stock == null ? 0 : Math.max(0, suggested - stock), status,
    };
  }).sort((a, b) => b.predicted_quantity - a.predicted_quantity);
  return {
    date: d.date, dow: d.dow, context: ctx, temp_c: temp, model: t.selected, model_name: t.results[t.selected].name, error_rmse: rmse,
    total_units: Math.round(rows.reduce((s, r) => s + r.predicted_quantity, 0)),
    restock_count: rows.filter((r) => r.status === 'restock').length, items: rows,
  };
}

// ----------------------------------------------------------------- wait
function predictWait({ orders_ahead = 0, items_count = 1, total_qty = 1, max_prep_min = 5, hour, dow }) {
  const t = task('wait');
  const now = new Date();
  const row = F.waitRow({
    orders_ahead: Number(orders_ahead), items_count: Number(items_count), total_qty: Number(total_qty), max_prep_min: Number(max_prep_min),
    hour: hour != null ? Number(hour) : F.hourInTz(now), dow: dow != null ? Number(dow) : F.dateParts(F.dateInTz(now)).dow,
  });
  const ml = clampNum(A.predict(t.model, row), 1);
  return { minutes: Math.max(1, Math.round(ml)), rule_based_minutes: Math.round(Number(orders_ahead) * 3 + Number(max_prep_min)), model: t.selected, model_name: t.results[t.selected].name, error_rmse: t.results[t.selected].rmse };
}

// ------------------------------------------------------------- reporting
function overview() {
  const s = ensureReady();
  const tasks = {};
  for (const [k, t] of Object.entries(s.tasks)) {
    const { model, meta, ...rest } = t; // never send the raw model to the browser
    tasks[k] = rest;
  }
  return { trained_at: s.trained_at, training_seconds: s.training_seconds, training_in_progress: training, data_sources: s.data_sources, tasks };
}

async function retrain({ useLiveData = true } = {}) {
  if (training) throw new Error('Training is already running');
  training = true;
  try {
    let realData = null;
    if (useLiveData) {
      try { realData = await require('./mlData').loadLiveData(); } catch (e) { console.warn('[ml] could not load live order data:', e.message); }
    }
    await new Promise((r) => setImmediate(r)); // let pending responses flush before the CPU-heavy part
    store = train({ realData }); saveStore(store);
    return overview();
  } finally { training = false; }
}

const DATASETS = { hourly_orders: 'hourly_orders.csv', daily_item_sales: 'daily_item_sales.csv', order_wait_times: 'order_wait_times.csv' };
const datasetPath = (name) => (DATASETS[name] ? path.join(DATA_DIR, DATASETS[name]) : null);

module.exports = { init, ensureReady, predictCrowd, predictDemand, predictWait, overview, retrain, datasetPath, DATASETS };
