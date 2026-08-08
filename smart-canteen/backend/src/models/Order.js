const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pickup_slot_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  token_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'accepted',
      'preparing',
      'ready',
      'collected',
      'cancelled',
      'rejected'
    ),
    defaultValue: 'pending',
  },
  subtotal_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  coupon_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  payment_method: {
    // 'upi_demo' = simulated UPI flow (no real gateway wired up — see README)
    // 'wallet' = real internal college-wallet deduction (see User.wallet_balance)
    type: DataTypes.ENUM('cash', 'upi_demo', 'wallet'),
    defaultValue: 'cash',
  },
  qr_code_data_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Assigned by kitchen staff when marking an order ready — lets students
  // know exactly where to stand instead of guessing.
  counter_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // True when a canteen staff/admin created this order for a walk-in
  // customer with no account (manual order entry). user_id in that case is
  // the staff member who entered it, not a customer — walk_in_name is the
  // actual customer's name for the token/counter call-out.
  is_manual_entry: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  walk_in_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reward_points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Order;
