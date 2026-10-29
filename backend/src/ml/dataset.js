'use strict';
// Synthetic-but-realistic dataset generator for CampusBite.
// It simulates a year of canteen activity using the real 37-item menu and
// hidden "ground-truth" behaviour (weekday patterns, exams, holidays, rain,
// temperature, kitchen staffing...). The ML models never see these formulas -
// they must LEARN the patterns from the CSV rows, exactly like with real data.
const fs = require('fs');
const path = require('path');
const { makeRng } = require('./rng');
const { writeCsv } = require('./csv');
const { HOURS, CATEGORY_SLUGS, monthTemp, dateParts, addDays } = require('./features');

const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(__dirname, '..', 'seed', 'menu_dataset.json');

const HOUR_WEIGHT = { 8: 0.9, 9: 1.0, 10: 0.55, 11: 0.7, 12: 1.5, 13: 1.9, 14: 1.0, 15: 0.7, 16: 1.2, 17: 1.1, 18: 0.7, 19: 0.5 };
const DOW_FACTOR = [0.15, 1.0, 1.05, 1.0, 1.0, 0.95, 0.45]; // Sun..Sat
const MONTH_FACTOR = [1.0, 1.0, 1.0, 0.95, 0.5, 0.55, 0.95, 1.05, 1.05, 1.0, 1.0, 0.7]; // vacations in May/Jun/Dec
const RAIN_PROB = [0.05, 0.05, 0.08, 0.15, 0.25, 0.55, 0.6, 0.6, 0.5, 0.35, 0.15, 0.08];
const BASE_DAILY_ORDERS = 400;
const EXAM_WINDOWS = [[70, 88], [160, 174], [320, 338]]; // day-of-year ranges

// typical units sold on a normal weekday (per item name)
const ITEM_BASE = {
  'Idli Sambar (2 pcs)': 38, 'Masala Dosa': 42, 'Plain Dosa': 20, 'Vada (2 pcs)': 28, 'Poori Bhaji': 18, 'Upma': 14, 'Bread Omelette': 16,
  'Veg Meals (Full)': 55, 'Curd Rice': 24, 'Veg Biryani': 32, 'Chicken Biryani': 28, 'Chapati with Curry (2 pcs)': 22, 'Rajma Rice': 20,
  'Veg Puff': 36, 'Samosa (2 pcs)': 40, 'Chilli Bajji (4 pcs)': 14, 'Onion Pakoda': 16, 'Veg Sandwich': 24, 'Maggi Noodles': 30, 'Chicken Roll': 18,
  'Filter Coffee': 60, 'Masala Tea': 55, 'Black Tea': 22, 'Fresh Lime Juice': 24, 'Mosambi Juice': 10, 'Watermelon Juice': 14, 'Buttermilk': 20, 'Cold Coffee': 26,
  'Vanilla Cup': 14, 'Chocolate Cup': 16, 'Butterscotch Cup': 12, 'Kulfi Stick': 15, 'Gulab Jamun (2 pcs)': 12,
  'Chapati Roll': 12, 'Fried Rice': 14, 'Noodles': 15, 'Egg Bhurji with Chapati': 9,
};
const HOT_DRINKS = new Set(['Filter Coffee', 'Masala Tea', 'Black Tea']);
const FRIED = new Set(['Chilli Bajji (4 pcs)', 'Onion Pakoda', 'Samosa (2 pcs)', 'Maggi Noodles', 'Veg Puff']);
const COLD = new Set(['Fresh Lime Juice', 'Mosambi Juice', 'Watermelon Juice', 'Buttermilk', 'Cold Coffee']);
const EXAM_BOOST = new Set(['Filter Coffee', 'Masala Tea', 'Cold Coffee', 'Maggi Noodles', 'Chapati Roll', 'Fried Rice', 'Noodles', 'Egg Bhurji with Chapati']);

const dayOfYear = (s) => { const { year } = dateParts(s); return Math.round((Date.parse(s) - Date.UTC(year, 0, 0)) / 86400000); };
const isExamDay = (s) => { const d = dayOfYear(s); return EXAM_WINDOWS.some(([a, b]) => d >= a && d <= b); };

function loadMenu() {
  const m = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
  const items = [];
  m.categories.forEach((c) => c.items.forEach((it) => items.push({
    item_name: it.name, category_slug: c.slug, cat_idx: Math.max(0, CATEGORY_SLUGS.indexOf(c.slug)),
    price: it.price, is_veg: it.is_veg === false ? 0 : 1, prep_time: it.prep_time_minutes || 5,
  })));
  return items;
}

function buildCalendar(days, endDate, rng) {
  const cal = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const { dow, month } = dateParts(date);
    const holiday = dow !== 0 && rng() < 0.05 ? 1 : 0;
    const rain = rng() < RAIN_PROB[month - 1] ? 1 : 0;
    const temp = +(monthTemp(month) + rng.normal(0, 1.8) - (rain ? 2 : 0)).toFixed(1);
    cal.push({ date, dow, month, is_holiday: holiday, is_exam: isExamDay(date) ? 1 : 0, rain, temp_c: temp });
  }
  return cal;
}

function dayFactor(c) {
  return DOW_FACTOR[c.dow] * MONTH_FACTOR[c.month - 1] * (c.is_holiday ? 0.12 : 1);
}

function genHourly(cal, rng) {
  const wsum = Object.values(HOUR_WEIGHT).reduce((a, b) => a + b, 0);
  const rows = [];
  for (const c of cal) {
    const noise = Math.exp(rng.normal(0, 0.06)); // day-level randomness
    for (const hour of HOURS) {
      let lam = BASE_DAILY_ORDERS * (HOUR_WEIGHT[hour] / wsum) * dayFactor(c) * noise;
      if (c.rain) lam *= 1.08;
      if (c.is_exam) lam *= hour >= 16 ? 1.25 : hour >= 12 && hour <= 14 ? 0.88 : 0.95;
      rows.push({ date: c.date, hour, dow: c.dow, is_weekend: c.dow === 0 || c.dow === 6 ? 1 : 0, is_holiday: c.is_holiday, is_exam: c.is_exam, rain: c.rain, month: c.month, orders: rng.poisson(lam) });
    }
  }
  return rows;
}

function genDemand(cal, menu, rng) {
  const rows = [];
  for (const c of cal) {
    const noise = Math.exp(rng.normal(0, 0.07));
    for (const it of menu) {
      let lam = (ITEM_BASE[it.item_name] ?? 15) * dayFactor(c) * noise;
      const n = it.item_name;
      if (c.rain) {
        if (HOT_DRINKS.has(n)) lam *= 1.3;
        else if (FRIED.has(n)) lam *= 1.25;
        else if (COLD.has(n) || it.category_slug === 'ice-cream') lam *= 0.8;
      }
      if (COLD.has(n) || it.category_slug === 'ice-cream') lam *= Math.min(1.6, Math.max(0.6, 1 + 0.045 * (c.temp_c - 26)));
      if (HOT_DRINKS.has(n)) lam *= Math.max(0.7, 1 - 0.02 * (c.temp_c - 26));
      if (c.is_exam) lam *= EXAM_BOOST.has(n) ? 1.3 : (it.category_slug === 'lunch' || it.category_slug === 'breakfast') ? 0.9 : 1;
      if ((n === 'Veg Biryani' || n === 'Chicken Biryani') && c.dow === 5) lam *= 1.3; // Friday biryani special
      if (n === 'Poori Bhaji' && c.dow === 1) lam *= 1.3;                                   // Monday poori
      rows.push({ date: c.date, item_name: n, category_slug: it.category_slug, cat_idx: it.cat_idx, price: it.price, is_veg: it.is_veg, prep_time: it.prep_time, dow: c.dow, is_holiday: c.is_holiday, is_exam: c.is_exam, rain: c.rain, temp_c: c.temp_c, month: c.month, qty: rng.poisson(lam) });
    }
  }
  return rows;
}

function genWait(menu, rng, n = 6000) {
  const wsum = Object.values(HOUR_WEIGHT).reduce((a, b) => a + b, 0);
  const hours = HOURS.flatMap((h) => Array(Math.round(HOUR_WEIGHT[h] * 10)).fill(h));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const hour = hours[rng.int(0, hours.length - 1)];
    const dow = rng.int(0, 6);
    const crowd = (HOUR_WEIGHT[hour] / 1.9) * DOW_FACTOR[dow];
    const ahead = rng.poisson(0.5 + 13 * crowd);
    const itemsCount = Math.min(5, 1 + rng.poisson(1.0));
    let totalQty = 0, maxPrep = 0;
    for (let k = 0; k < itemsCount; k++) { totalQty += rng.int(1, 3); maxPrep = Math.max(maxPrep, menu[rng.int(0, menu.length - 1)].prep_time); }
    const staff = Math.min(5, Math.max(2, Math.round(2 + 3 * crowd + rng.normal(0, 0.6)))); // hidden variable
    const own = maxPrep * (1 + 0.1 * (totalQty - 1));
    const queue = 1.3 * ahead * Math.pow(3 / staff, 0.9);
    const congestion = ahead > 12 ? 0.15 * Math.pow(ahead - 12, 1.5) : 0;
    const base = own + queue + congestion;
    const wait = Math.max(1, base + rng.normal(0, 0.8 + 0.06 * base));
    rows.push({ orders_ahead: ahead, items_count: itemsCount, total_qty: totalQty, max_prep_min: maxPrep, hour, dow, wait_minutes: +wait.toFixed(1) });
  }
  return rows;
}

const COLUMNS = {
  hourly_orders: ['date', 'hour', 'dow', 'is_weekend', 'is_holiday', 'is_exam', 'rain', 'month', 'orders'],
  daily_item_sales: ['date', 'item_name', 'category_slug', 'cat_idx', 'price', 'is_veg', 'prep_time', 'dow', 'is_holiday', 'is_exam', 'rain', 'temp_c', 'month', 'qty'],
  order_wait_times: ['orders_ahead', 'items_count', 'total_qty', 'max_prep_min', 'hour', 'dow', 'wait_minutes'],
};

function generateAll({ days = 365, endDate = '2026-10-25', seed = 2026, dir = DATA_DIR } = {}) {
  const rng = makeRng(seed);
  const menu = loadMenu();
  const cal = buildCalendar(days, endDate, rng);
  const out = {
    hourly_orders: genHourly(cal, rng),
    daily_item_sales: genDemand(cal, menu, rng),
    order_wait_times: genWait(menu, rng),
  };
  for (const [name, rows] of Object.entries(out)) writeCsv(path.join(dir, `${name}.csv`), COLUMNS[name], rows);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
}

module.exports = { generateAll, DATA_DIR, COLUMNS, HOUR_WEIGHT };
