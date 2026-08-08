const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // USN (student) / employee ID (staff) — this is the login username, not
  // an internal reference anymore, so it's required + unique.
  usn_or_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Used only for identity verification during password reset — never as
  // the password itself. Required so the forgot-password flow works.
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Optional now — USN is the login identifier, email is just contact info
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('student', 'staff', 'canteen_staff', 'manager', 'admin'),
    defaultValue: 'student',
  },
  // Internal college-canteen wallet — a real, working payment method that
  // needs no external gateway. Top-ups are demo (instant credit) since a
  // real top-up would need the college's own payment collection system,
  // but *spending* the balance at checkout is fully real.
  wallet_balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  // Simple self-contained loyalty system — no external loyalty platform,
  // just points tracked on the user and redeemable for wallet credit.
  reward_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  referral_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  referred_by_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
