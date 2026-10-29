const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A PickupSlot represents a fixed window of time (e.g. 12:30-12:40) on a
// given date. Orders are assigned to a slot; once a slot's order_count
// reaches capacity, new orders spill over into the next slot. This is the
// mechanism that spreads the crowd out instead of everyone showing up at
// the same 5 minutes.
const PickupSlot = sequelize.define('PickupSlot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  slot_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  slot_time: {
    // stored as 'HH:MM' 24hr
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  order_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'pickup_slots',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['slot_date', 'slot_time'] },
  ],
});

module.exports = PickupSlot;
