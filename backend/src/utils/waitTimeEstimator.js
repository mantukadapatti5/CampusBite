const { Order, OrderItem, MenuItem } = require('../models');
const { Op } = require('sequelize');
const mlService = require('../ml/mlService');

// Fallback rule: average minutes the kitchen takes to clear one order ahead.
// The primary estimate now comes from the trained wait-time model (src/ml).
const AVG_ORDER_CLEAR_MINUTES = 3;

/**
 * Estimated minutes until an order is ready. Features fed to the ML model:
 * orders ahead in the queue, number of items, total quantity, longest prep
 * time, hour of day and weekday. Falls back to the simple rule if the model
 * is unavailable.
 */
async function estimateWaitMinutes(order) {
  if (['ready', 'collected', 'cancelled'].includes(order.status)) return 0;

  const aheadCount = await Order.count({
    where: {
      status: ['pending', 'accepted', 'preparing'],
      created_at: { [Op.lt]: order.created_at },
    },
  });

  const items = await OrderItem.findAll({
    where: { order_id: order.id },
    include: [{ model: MenuItem, as: 'menuItem', attributes: ['prep_time_minutes'] }],
  });
  const ownPrepTime = items.reduce(
    (max, i) => Math.max(max, i.menuItem?.prep_time_minutes || 5),
    0
  );

  try {
    return mlService.predictWait({
      orders_ahead: aheadCount,
      items_count: Math.max(1, items.length),
      total_qty: Math.max(1, items.reduce((s, i) => s + (i.quantity || 1), 0)),
      max_prep_min: ownPrepTime || 5,
    }).minutes;
  } catch (e) {
    console.error('[ml] wait-time prediction failed, using rule:', e.message);
    return aheadCount * AVG_ORDER_CLEAR_MINUTES + ownPrepTime;
  }
}

module.exports = { estimateWaitMinutes, AVG_ORDER_CLEAR_MINUTES };
