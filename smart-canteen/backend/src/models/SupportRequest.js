const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SupportRequest = sequelize.define('SupportRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('suggestion', 'issue'),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'resolved'),
    defaultValue: 'open',
  },
}, {
  tableName: 'support_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = SupportRequest;
