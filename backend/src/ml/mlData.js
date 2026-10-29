'use strict';
// Database helpers for the ML module (kept separate so the pure ML code can
// run and be tested without a database).
const { QueryTypes } = require('sequelize');
const F = require('./features');

const TZ = F.DEFAULT_TZ;

// Pull the last 120 days of REAL orders and turn them into training rows with
// the same columns as the generated CSV files.
async function loadLiveData() {
  const sequelize = require('../config/db');
  const hourlyRaw = await sequelize.query(
    `SELECT TO_CHAR(o.created_at AT TIME ZONE :tz, 'YYYY-MM-DD') AS d,
            EXTRACT(HOUR FROM o.created_at AT TIME ZONE :tz)::int AS hr, COUNT(*)::int AS c
     FROM orders o
     WHERE o.status NOT IN ('cancelled','rejected') AND o.created_at >= NOW() - INTERVAL '120 days'
     GROUP BY 1, 2`,
    { replacements: { tz: TZ }, type: QueryTypes.SELECT }
  );
  const byDay = {};
  hourlyRaw.forEach((r) => { (byDay[r.d] = byDay[r.d] || {})[r.hr] = r.c; });
  const dates = Object.keys(byDay).sort();
  const hourly = [];
  for (const date of dates) {
    const { dow, month } = F.dateParts(date);
    for (const hour of F.HOURS) {
      hourly.push({ date, hour, dow, is_weekend: dow === 0 || dow === 6 ? 1 : 0, is_holiday: 0, is_exam: 0, rain: 0, month, orders: byDay[date][hour] || 0 });
    }
  }

  const menu = await sequelize.query(
    `SELECT mi.name AS item_name, c.slug AS category_slug, mi.price::float AS price, mi.is_veg, mi.prep_time_minutes AS prep_time
     FROM menu_items mi JOIN categories c ON c.id = mi.category_id`,
    { type: QueryTypes.SELECT }
  );
  const salesRaw = await sequelize.query(
    `SELECT TO_CHAR(o.created_at AT TIME ZONE :tz, 'YYYY-MM-DD') AS d, mi.name AS item_name, SUM(oi.quantity)::int AS qty
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE o.status NOT IN ('cancelled','rejected') AND o.created_at >= NOW() - INTERVAL '120 days'
     GROUP BY 1, 2`,
    { replacements: { tz: TZ }, type: QueryTypes.SELECT }
  );
  const sold = {};
  salesRaw.forEach((r) => { sold[`${r.d}|${r.item_name}`] = r.qty; });
  const demand = [];
  for (const date of dates) {
    const { dow, month } = F.dateParts(date);
    for (const m of menu) {
      demand.push({
        date, item_name: m.item_name, category_slug: m.category_slug, cat_idx: Math.max(0, F.CATEGORY_SLUGS.indexOf(m.category_slug)),
        price: m.price, is_veg: m.is_veg ? 1 : 0, prep_time: m.prep_time || 5, dow, is_holiday: 0, is_exam: 0, rain: 0, temp_c: F.monthTemp(month), month,
        qty: sold[`${date}|${m.item_name}`] || 0,
      });
    }
  }
  return { hourly, demand };
}

// Menu items in the shape predictDemand() expects
async function loadMenuForForecast() {
  const { MenuItem, Category } = require('../models');
  const items = await MenuItem.findAll({ include: [{ model: Category, as: 'category', attributes: ['slug'] }] });
  return items.map((i) => ({
    id: i.id, name: i.name, category_slug: i.category?.slug || 'snacks', price: Number(i.price),
    is_veg: i.is_veg, stock_quantity: i.stock_quantity, is_available: i.is_available,
  }));
}

module.exports = { loadLiveData, loadMenuForForecast };
