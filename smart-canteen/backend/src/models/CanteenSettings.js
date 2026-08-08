const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Single-row settings table (id always 1) — business hours, tax rate, and
// a slot-capacity override the admin can tune without touching env vars.
const CanteenSettings = sequelize.define('CanteenSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1,
  },
  opens_at: {
    type: DataTypes.STRING, // 'HH:MM'
    defaultValue: '08:00',
  },
  closes_at: {
    type: DataTypes.STRING,
    defaultValue: '20:00',
  },
  tax_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  slot_capacity_override: {
    // null = use the SLOT_CAPACITY env default
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'canteen_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = CanteenSettings;
