const { Order, OrderItem, MenuItem } = require('../models');
const { Op } = require('sequelize');

// Average minutes the kitchen takes to clear one order ahead in the queue.
// This is a simple heuristic (not a scheduling simulation) — good enough
// for a "roughly N minutes" estimate on the tracking screen.
const AVG_ORDER_CLEAR_MINUTES = 3;

/**
 * Estimated minutes until an order is ready, based on:
 *  - how many other active orders were placed before it (queue position)
 *  - the longest prep_time_minutes among this order's own items
 * This is intentionally simple heuristic, not a full kitchen simulation.
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

  return aheadCount * AVG_ORDER_CLEAR_MINUTES + ownPrepTime;
}

module.exports = { estimateWaitMinutes, AVG_ORDER_CLEAR_MINUTES };
