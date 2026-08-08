const { sequelize, Order, OrderItem } = require('../models');
const { Op, QueryTypes } = require('sequelize');

/**
 * IMPORTANT (be upfront about this in the UI too): these are historical-
 * average heuristics, not trained ML models. They use real order history
 * once it exists. On a fresh install with no order history, they'll return
 * empty/placeholder results — that's expected, not a bug. You can honestly
 * call this "data-driven crowd prediction" in your report; just don't call
 * it a trained ML model unless you actually build one on top of this data.
 */

// Predict expected crowd level per hour-of-day, based on past orders on the
// same weekday. Falls back to overall hourly average if a weekday has no
// history yet.
async function predictCrowdByHour() {
  const today = new Date();
  const weekday = today.getDay(); // 0=Sun..6=Sat

  const rows = await sequelize.query(
    `
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour,
      COUNT(*) AS order_count
    FROM orders
    WHERE EXTRACT(DOW FROM created_at) = :weekday
      AND created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY hour
    ORDER BY hour
    `,
    { replacements: { weekday }, type: QueryTypes.SELECT }
  );

  if (rows.length === 0) {
    return { has_history: false, hours: [] };
  }

  const max = Math.max(...rows.map((r) => Number(r.order_count)));
  const hours = rows.map((r) => ({
    hour: Number(r.hour),
    order_count: Number(r.order_count),
    level: Number(r.order_count) / max > 0.7 ? 'high' : Number(r.order_count) / max > 0.35 ? 'medium' : 'low',
  }));

  return { has_history: true, hours };
}

// Suggested prep quantities for tomorrow per menu item, based on the
// average sold over the last 7 occurrences of that weekday.
async function forecastDemand() {
  const rows = await sequelize.query(
    `
    SELECT
      mi.id AS menu_item_id,
      mi.name,
      ROUND(AVG(daily.qty)) AS suggested_quantity
    FROM (
      SELECT
        oi.menu_item_id,
        DATE(o.created_at) AS order_date,
        SUM(oi.quantity) AS qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= NOW() - INTERVAL '30 days'
        AND o.status != 'cancelled'
      GROUP BY oi.menu_item_id, DATE(o.created_at)
    ) daily
    JOIN menu_items mi ON mi.id = daily.menu_item_id
    GROUP BY mi.id, mi.name
    ORDER BY suggested_quantity DESC
    LIMIT 15
    `,
    { type: QueryTypes.SELECT }
  );

  return rows;
}

// "Frequently bought together" — items that co-occur in the same order most
// often, used to power a simple "Recommended add-ons" widget.
async function frequentlyBoughtWith(menuItemId) {
  const rows = await sequelize.query(
    `
    SELECT
      oi2.menu_item_id,
      mi.name,
      COUNT(*) AS times_together
    FROM order_items oi1
    JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi2.menu_item_id != oi1.menu_item_id
    JOIN menu_items mi ON mi.id = oi2.menu_item_id
    WHERE oi1.menu_item_id = :menuItemId
    GROUP BY oi2.menu_item_id, mi.name
    ORDER BY times_together DESC
    LIMIT 4
    `,
    { replacements: { menuItemId }, type: QueryTypes.SELECT }
  );
  return rows;
}

module.exports = { predictCrowdByHour, forecastDemand, frequentlyBoughtWith };
