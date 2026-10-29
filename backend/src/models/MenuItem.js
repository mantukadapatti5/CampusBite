const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stock_quantity: {
    // null/negative means "not tracked / unlimited"
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_veg: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  ingredients: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  allergens: {
    // free-text comma-separated (e.g. "milk, gluten, nuts") — simple and
    // good enough for a canteen menu; a dedicated tags table would be
    // overkill here
    type: DataTypes.STRING,
    allowNull: true,
  },
  prep_time_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Optional — for items with a shelf life (packaged snacks, dairy). Blank
  // for freshly-cooked items that don't apply.
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'menu_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = MenuItem;
