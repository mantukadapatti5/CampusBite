const bcrypt = require('bcryptjs');
const { sequelize, Order, OrderItem, MenuItem, User } = require('../models');
const { Op, QueryTypes } = require('sequelize');

exports.dashboard = async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await Order.findAll({
    where: { created_at: { [Op.gte]: startOfDay } },
  });

  const revenueToday = todayOrders
    .filter((o) => o.payment_status === 'paid' || o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const statusCounts = todayOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const topItems = await OrderItem.findAll({
    attributes: [
      'menu_item_id',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold'],
    ],
    include: [{ model: MenuItem, as: 'menuItem', attributes: ['name'] }],
    group: ['menu_item_id', 'menuItem.id', 'menuItem.name'],
    order: [[sequelize.literal('total_sold'), 'DESC']],
    limit: 5,
  });

  const lowStock = await MenuItem.findAll({
    where: {
      stock_quantity: { [Op.lte]: 10, [Op.gte]: 0 },
      is_available: true,
    },
    attributes: ['id', 'name', 'stock_quantity'],
  });

  res.json({
    orders_today: todayOrders.length,
    revenue_today: revenueToday,
    status_breakdown: statusCounts,
    top_selling_items: topItems,
    low_stock_items: lowStock,
  });
};

// Date-range revenue report — weekly/monthly/yearly, whatever range the
// admin asks for, bucketed by day so it can be charted.
// Kitchen role: order-status counts only — deliberately excludes revenue/
// financial data, which is a manager/admin concern, not a kitchen one.
exports.kitchenDashboard = async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await Order.findAll({
    where: { created_at: { [Op.gte]: startOfDay } },
    attributes: ['status'],
  });

  const counts = todayOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  res.json({
    pending: counts.pending || 0,
    accepted: counts.accepted || 0,
    preparing: counts.preparing || 0,
    ready: counts.ready || 0,
    collected: counts.collected || 0,
    cancelled: (counts.cancelled || 0) + (counts.rejected || 0),
  });
};

exports.reports = async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(end) : new Date();

  const daily = await sequelize.query(
    `SELECT
       DATE(created_at) AS day,
       COUNT(*) AS order_count,
       SUM(total_amount) AS revenue
     FROM orders
     WHERE created_at BETWEEN :start AND :end
       AND status != 'cancelled'
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    { replacements: { start: startDate, end: endDate }, type: QueryTypes.SELECT }
  );

  const leastOrdered = await OrderItem.findAll({
    attributes: ['menu_item_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold']],
    include: [{ model: MenuItem, as: 'menuItem', attributes: ['name'] }],
    group: ['menu_item_id', 'menuItem.id', 'menuItem.name'],
    order: [[sequelize.literal('total_sold'), 'ASC']],
    limit: 5,
  });

  const totals = daily.reduce(
    (acc, d) => ({ orders: acc.orders + Number(d.order_count), revenue: acc.revenue + Number(d.revenue) }),
    { orders: 0, revenue: 0 }
  );

  res.json({ daily, least_ordered_items: leastOrdered, totals });
};

// --- Staff/employee management (the realistic slice — no shift/attendance
// tracking, since that's out of scope for an ordering system and would add
// bulk without demo value) ---
exports.listStaff = async (req, res) => {
  const staff = await User.findAll({
    where: { role: ['canteen_staff', 'manager', 'admin'] },
    attributes: ['id', 'name', 'usn_or_id', 'phone', 'role', 'created_at'],
    order: [['created_at', 'DESC']],
  });
  res.json(staff);
};

exports.addStaff = async (req, res) => {
  const { name, phone, password, role } = req.body;
  const usn_or_id = req.body.usn_or_id?.trim().toLowerCase();
  if (!name || !usn_or_id || !phone || !password || !['canteen_staff', 'manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'name, usn_or_id, phone, password, and role (canteen_staff|manager|admin) are required' });
  }
  // A manager can hire kitchen staff, but only an admin can create another
  // manager or admin account — otherwise a manager could promote themselves
  // to admin, which defeats the point of having separate roles.
  if (req.user.role === 'manager' && role !== 'canteen_staff') {
    return res.status(403).json({ error: 'Managers can only add Kitchen Staff accounts. Only an admin can create manager/admin accounts.' });
  }

  const existing = await User.findOne({ where: { usn_or_id } });
  if (existing) return res.status(409).json({ error: 'An account with this ID already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const referral_code = `${usn_or_id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const user = await User.create({ name, usn_or_id, phone, password_hash, role, referral_code });
  res.status(201).json({ id: user.id, name: user.name, usn_or_id: user.usn_or_id, role: user.role });
};

exports.removeStaff = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user || !['canteen_staff', 'manager', 'admin'].includes(user.role)) {
    return res.status(404).json({ error: 'Staff account not found' });
  }
  if (user.id === req.user.id) {
    return res.status(400).json({ error: "You can't remove your own account" });
  }
  if (req.user.role === 'manager' && user.role !== 'canteen_staff') {
    return res.status(403).json({ error: 'Managers can only remove Kitchen Staff accounts.' });
  }
  await user.destroy();
  res.json({ success: true });
};
