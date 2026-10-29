'use strict';
// Shared feature definitions: the SAME code builds feature vectors for
// training (trainer.js) and for live prediction (mlService.js), so there is
// no train/serve mismatch.

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // canteen hours 08:00-20:00
const CATEGORY_SLUGS = ['breakfast', 'lunch', 'snacks', 'beverages', 'ice-cream', 'night'];
const MONTH_TEMP = [23, 25, 28, 30, 30, 27, 25, 25, 26, 25, 24, 23]; // avg °C by month (Bengaluru-like)
const DEFAULT_TZ = process.env.APP_TZ || 'Asia/Kolkata';

const FEATURES = {
  crowd: ['hour', 'dow', 'is_weekend', 'is_holiday', 'is_exam', 'rain', 'month'],
  demand: ['item_popularity', 'category', 'price', 'is_veg', 'dow', 'is_holiday', 'is_exam', 'rain', 'temp_c', 'month'],
  wait: ['orders_ahead', 'items_count', 'total_qty', 'max_prep_min', 'hour', 'dow'],
};

// categorical columns (used for one-hot encoding in the linear model)
const CATEGORICAL = {
  crowd: { hour: HOURS, dow: [0, 1, 2, 3, 4, 5, 6], month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  demand: { category: [0, 1, 2, 3, 4, 5], dow: [0, 1, 2, 3, 4, 5, 6], month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  wait: { hour: HOURS, dow: [0, 1, 2, 3, 4, 5, 6] },
};

const monthTemp = (month) => MONTH_TEMP[(month - 1 + 12) % 12];

function crowdRow(r) {
  return [r.hour, r.dow, r.dow === 0 || r.dow === 6 ? 1 : 0, r.is_holiday ? 1 : 0, r.is_exam ? 1 : 0, r.rain ? 1 : 0, r.month];
}

// item popularity = average units/day for that item in the TRAINING data
// (a target-encoding of the item). Unknown (new) items fall back to the
// average of their category, then the global average.
function itemPopularity(meta, name, categorySlug) {
  if (meta.item_pop[name] != null) return meta.item_pop[name];
  if (meta.category_pop[categorySlug] != null) return meta.category_pop[categorySlug];
  return meta.global_pop;
}

function demandRow(r, meta) {
  return [
    itemPopularity(meta, r.item_name, r.category_slug),
    Math.max(0, meta.categories.indexOf(r.category_slug)),
    Number(r.price), r.is_veg ? 1 : 0, r.dow, r.is_holiday ? 1 : 0, r.is_exam ? 1 : 0, r.rain ? 1 : 0, r.temp_c, r.month,
  ];
}

function waitRow(r) {
  return [r.orders_ahead, r.items_count, r.total_qty, r.max_prep_min, r.hour, r.dow];
}

// "YYYY-MM-DD" in a given time zone (defaults to today)
function dateInTz(date = new Date(), tz = DEFAULT_TZ) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return p; // en-CA => YYYY-MM-DD
}
function hourInTz(date = new Date(), tz = DEFAULT_TZ) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(date)) % 24;
}
function dateParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return { dow: dt.getUTCDay(), month: m, year: y, day: d };
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

module.exports = {
  HOURS, CATEGORY_SLUGS, FEATURES, CATEGORICAL, DEFAULT_TZ,
  monthTemp, crowdRow, demandRow, waitRow, itemPopularity,
  dateInTz, hourInTz, dateParts, addDays,
};
