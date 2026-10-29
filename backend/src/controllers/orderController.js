const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { sequelize, Order, OrderItem, MenuItem, PickupSlot, Coupon, Feedback, User, CanteenSettings } = require('../models');
const { assignNextAvailableSlot, getQueueStatus } = require('../utils/pickupSlotService');
const { estimateWaitMinutes } = require('../utils/waitTimeEstimator');
const { emitNewOrder, emitOrderStatusChanged, emitQueueChanged } = require('../websocket/io');

const POINTS_PER_RUPEE = 1 / 20; // 1 point per ₹20 spent, awarded on collection

function generateToken() {
  // Simple human-readable daily token, e.g. "T-284". A real deployment
  // would reset this counter per day; kept simple for the demo.
  return `T-${Math.floor(100 + Math.random() * 900)}`;
}

async function attachExtras(order) {
  const wait_minutes = await estimateWaitMinutes(order);
  const plain = order.toJSON ? order.toJSON() : order;
  return { ...plain, estimated_wait_minutes: wait_minutes };
}

async function buildOrder({ userId, items, coupon_code, payment_method, scheduled_for, is_manual_entry, walk_in_name }, t) {
  const menuItems = await MenuItem.findAll({
    where: { id: items.map((i) => i.menu_item_id) },
    transaction: t,
  });

  if (menuItems.length !== items.length) {
    throw new Error('One or more menu items were not found');
  }

  let subtotal = 0;
  const orderItemsData = [];

  for (const requested of items) {
    const menuItem = menuItems.find((m) => m.id === requested.menu_item_id);
    if (!menuItem.is_available) {
      throw new Error(`${menuItem.name} is currently unavailable`);
    }
    if (menuItem.stock_quantity != null && menuItem.stock_quantity >= 0 && menuItem.stock_quantity < requested.quantity) {
      throw new Error(`Only ${menuItem.stock_quantity} of ${menuItem.name} left`);
    }
    subtotal += Number(menuItem.price) * requested.quantity;
    orderItemsData.push({
      menu_item_id: menuItem.id,
      quantity: requested.quantity,
      price_at_order: menuItem.price,
      special_instructions: requested.special_instructions || null,
    });
  }

  let discount = 0;
  let appliedCouponCode = null;
  if (coupon_code) {
    const coupon = await Coupon.findOne({ where: { code: coupon_code.toUpperCase() }, transaction: t });
    if (!coupon || !coupon.is_active) throw new Error('Invalid or inactive coupon code');
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error('This coupon has expired');
    if (subtotal < Number(coupon.min_order_amount)) throw new Error(`Coupon needs a minimum order of ₹${coupon.min_order_amount}`);
    discount = Math.round((subtotal * coupon.discount_percent) / 100);
    appliedCouponCode = coupon.code;
  }

  const total_before_tax = subtotal - discount;
  const settings = await CanteenSettings.findByPk(1);
  const taxPercent = settings ? Number(settings.tax_percent) : 0;
  const tax = Math.round((total_before_tax * taxPercent) / 100 * 100) / 100;
  const total = total_before_tax + tax;
  const slot = await assignNextAvailableSlot(scheduled_for);
  const token_number = generateToken();

  let payment_status = 'pending';
  const method = ['upi_demo', 'wallet'].includes(payment_method) ? payment_method : 'cash';

  if (method === 'wallet') {
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (Number(user.wallet_balance) < total) {
      throw new Error(`Insufficient wallet balance (₹${user.wallet_balance} available, ₹${total} needed)`);
    }
    await user.decrement('wallet_balance', { by: total, transaction: t });
    payment_status = 'paid';
  } else if (method === 'upi_demo') {
    payment_status = 'paid';
  }

  const order = await Order.create({
    user_id: userId,
    pickup_slot_id: slot.id,
    token_number,
    subtotal_amount: subtotal,
    discount_amount: discount,
    tax_amount: tax,
    coupon_code: appliedCouponCode,
    total_amount: total,
    payment_method: method,
    payment_status,
    status: 'pending',
    is_manual_entry: !!is_manual_entry,
    walk_in_name: walk_in_name || null,
  }, { transaction: t });

  for (const oi of orderItemsData) {
    await OrderItem.create({ ...oi, order_id: order.id }, { transaction: t });
    const menuItem = menuItems.find((m) => m.id === oi.menu_item_id);
    if (menuItem.stock_quantity != null && menuItem.stock_quantity >= 0) {
      await menuItem.decrement('stock_quantity', { by: oi.quantity, transaction: t });
      if (menuItem.stock_quantity - oi.quantity <= 0) {
        await menuItem.update({ is_available: false }, { transaction: t });
      }
    }
  }

  const qr_code_data_url = await QRCode.toDataURL(JSON.stringify({ order_id: order.id, token: token_number }));
  await order.update({ qr_code_data_url }, { transaction: t });

  return order;
}

exports.placeOrder = async (req, res) => {
  const { items, coupon_code, payment_method, scheduled_for } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }
  if (scheduled_for && new Date(scheduled_for) < new Date()) {
    return res.status(400).json({ error: 'Scheduled pickup time must be in the future' });
  }

  const t = await sequelize.transaction();
  try {
    const order = await buildOrder({ userId: req.user.id, items, coupon_code, payment_method, scheduled_for }, t);
    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
        { model: PickupSlot, as: 'pickupSlot' },
      ],
    });
    emitNewOrder(fullOrder);
    emitQueueChanged();
    res.status(201).json(await attachExtras(fullOrder));
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// Canteen staff/admin: enter an order on behalf of a walk-in customer at
// the counter (no student account needed). Billed to the staff member's
// own account for record-keeping, tagged is_manual_entry, cash only.
exports.manualOrder = async (req, res) => {
  const { items, walk_in_name } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }
  if (!walk_in_name) {
    return res.status(400).json({ error: 'walk_in_name is required for a manual/walk-in order' });
  }

  const t = await sequelize.transaction();
  try {
    const order = await buildOrder({
      userId: req.user.id, items, payment_method: 'cash',
      is_manual_entry: true, walk_in_name,
    }, t);
    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
        { model: PickupSlot, as: 'pickupSlot' },
      ],
    });
    emitNewOrder(fullOrder);
    emitQueueChanged();
    res.status(201).json(await attachExtras(fullOrder));
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  const orders = await Order.findAll({
    where: { user_id: req.user.id },
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
      { model: Feedback, as: 'feedback' },
    ],
    order: [['created_at', 'DESC']],
  });
  res.json(orders);
};

// Admin: full order history with optional status + date-range filters
exports.getAllOrders = async (req, res) => {
  const { status, start, end } = req.query;
  const where = {};
  if (status) where.status = status;
  if (start || end) {
    where.created_at = {};
    if (start) where.created_at[Op.gte] = new Date(start);
    if (end) where.created_at[Op.lte] = new Date(end);
  }

  const orders = await Order.findAll({
    where,
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
      { model: User, as: 'user', attributes: ['id', 'name', 'usn_or_id'] },
    ],
    order: [['created_at', 'DESC']],
    limit: 200,
  });
  res.json(orders);
};

exports.getOrderById = async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'Order ID must be a number' });
  }

  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
      { model: Feedback, as: 'feedback' },
    ],
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id !== req.user.id && !['admin', 'canteen_staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not your order' });
  }
  res.json(await attachExtras(order));
};

// Staff QR/manual lookup — scanning the order QR (or typing the token)
// resolves to this endpoint so staff can pull the order up at the counter.
exports.getOrderByToken = async (req, res) => {
  const order = await Order.findOne({
    where: { token_number: req.params.token },
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
    ],
    order: [['created_at', 'DESC']],
  });
  if (!order) return res.status(404).json({ error: 'No order found with that token' });
  res.json(order);
};

// Canteen staff / admin: view all active orders (kitchen display view)
exports.getActiveOrders = async (req, res) => {
  const orders = await Order.findAll({
    where: { status: ['pending', 'accepted', 'preparing', 'ready'] },
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
    ],
    order: [['created_at', 'ASC']],
  });

  const withFlags = orders.map((o) => {
    const maxPrep = Math.max(...o.items.map((oi) => oi.menuItem?.prep_time_minutes || 5));
    const elapsedMinutes = (Date.now() - new Date(o.created_at).getTime()) / 60000;
    const isDelayed = o.status !== 'ready' && elapsedMinutes > maxPrep + 5; // 5 min grace period
    // "missed pickup": sat in 'ready' status for over 15 minutes uncollected
    const readySinceMinutes = o.status === 'ready' ? (Date.now() - new Date(o.updated_at).getTime()) / 60000 : 0;
    const isMissedPickup = o.status === 'ready' && readySinceMinutes > 15;
    return {
      ...o.toJSON(),
      elapsed_minutes: Math.round(elapsedMinutes),
      is_delayed: isDelayed,
      is_missed_pickup: isMissedPickup,
    };
  });

  res.json(withFlags);
};

const VALID_TRANSITIONS = {
  pending: ['accepted', 'cancelled', 'rejected'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['collected'],
  collected: [],
  cancelled: [],
  rejected: [],
};

exports.updateStatus = async (req, res) => {
  const { status, counter_number } = req.body;
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot move order from '${order.status}' to '${status}'`,
    });
  }

  const t = await sequelize.transaction();
  try {
    const updates = { status };
    if (status === 'ready' && counter_number) updates.counter_number = counter_number;

    // Refund on cancellation: wallet payments are refunded to the wallet
    // automatically; cash/UPI-demo just get flagged 'refunded' since no
    // real money moved through this system to reverse.
    if (['cancelled', 'rejected'].includes(status) && order.payment_status === 'paid') {
      if (order.payment_method === 'wallet') {
        const user = await User.findByPk(order.user_id, { transaction: t, lock: t.LOCK.UPDATE });
        await user.increment('wallet_balance', { by: order.total_amount, transaction: t });
      }
      updates.payment_status = 'refunded';
      // restock items since the order never got made
      const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
      for (const oi of items) {
        const menuItem = await MenuItem.findByPk(oi.menu_item_id, { transaction: t });
        if (menuItem && menuItem.stock_quantity != null && menuItem.stock_quantity >= 0) {
          await menuItem.increment('stock_quantity', { by: oi.quantity, transaction: t });
          if (!menuItem.is_available) await menuItem.update({ is_available: true }, { transaction: t });
        }
      }
    }

    // Award loyalty points once the order is actually collected — not on
    // placement, so cancelling doesn't farm points.
    if (status === 'collected' && !order.is_manual_entry) {
      const points = Math.floor(Number(order.total_amount) * POINTS_PER_RUPEE);
      if (points > 0) {
        const user = await User.findByPk(order.user_id, { transaction: t });
        if (user) await user.increment('reward_points', { by: points, transaction: t });
        updates.reward_points_earned = points;
      }
    }

    await order.update(updates, { transaction: t });
    await t.commit();
    emitOrderStatusChanged(order);
    if (['cancelled', 'rejected'].includes(status)) emitQueueChanged(); // slot freed up
    res.json(order);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Could not update order status' });
  }
};

exports.queueStatus = async (req, res) => {
  const status = await getQueueStatus();
  res.json(status);
};

// PDF invoice for a collected/any order — self-contained generation, no
// external invoicing service.
exports.downloadInvoice = async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items', include: [{ model: MenuItem, as: 'menuItem' }] },
      { model: PickupSlot, as: 'pickupSlot' },
      { model: User, as: 'user', attributes: ['name', 'usn_or_id'] },
    ],
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id !== req.user.id && !['admin', 'canteen_staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not your order' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.token_number}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('Smart Canteen — Invoice', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555')
    .text(`Order token: ${order.token_number}`)
    .text(`Date: ${new Date(order.created_at).toLocaleString()}`)
    .text(`Billed to: ${order.user?.name || order.walk_in_name} (${order.user?.usn_or_id || 'walk-in'})`);
  doc.moveDown();

  doc.fillColor('#000').fontSize(12).text('Items', { underline: true });
  doc.moveDown(0.3);
  order.items.forEach((oi) => {
    const lineTotal = (Number(oi.price_at_order) * oi.quantity).toFixed(2);
    doc.fontSize(10).text(`${oi.menuItem?.name}  x${oi.quantity}   ₹${lineTotal}`);
  });

  doc.moveDown();
  doc.fontSize(10).text(`Subtotal: ₹${Number(order.subtotal_amount).toFixed(2)}`);
  if (Number(order.discount_amount) > 0) {
    doc.text(`Discount (${order.coupon_code}): -₹${Number(order.discount_amount).toFixed(2)}`);
  }
  doc.fontSize(12).text(`Total paid: ₹${Number(order.total_amount).toFixed(2)}`, { underline: true });
  doc.fontSize(9).fillColor('#888').moveDown().text(`Payment method: ${order.payment_method} (${order.payment_status})`);

  doc.end();
};
