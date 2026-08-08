const sequelize = require('../config/db');
const User = require('./User');
const Category = require('./Category');
const MenuItem = require('./MenuItem');
const PickupSlot = require('./PickupSlot');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Favorite = require('./Favorite');
const Feedback = require('./Feedback');
const Coupon = require('./Coupon');
const SupportRequest = require('./SupportRequest');
const Announcement = require('./Announcement');
const CanteenSettings = require('./CanteenSettings');

// Category <-> MenuItem
Category.hasMany(MenuItem, { foreignKey: 'category_id', as: 'items' });
MenuItem.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User <-> Order
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PickupSlot <-> Order
PickupSlot.hasMany(Order, { foreignKey: 'pickup_slot_id', as: 'orders' });
Order.belongsTo(PickupSlot, { foreignKey: 'pickup_slot_id', as: 'pickupSlot' });

// Order <-> OrderItem <-> MenuItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id' });

// User <-> Favorite <-> MenuItem
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id' });
Favorite.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
MenuItem.hasMany(Favorite, { foreignKey: 'menu_item_id' });

// Order <-> Feedback
Order.hasOne(Feedback, { foreignKey: 'order_id', as: 'feedback' });
Feedback.belongsTo(Order, { foreignKey: 'order_id' });
Feedback.belongsTo(User, { foreignKey: 'user_id' });

// User <-> SupportRequest
User.hasMany(SupportRequest, { foreignKey: 'user_id', as: 'supportRequests' });
SupportRequest.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Category,
  MenuItem,
  PickupSlot,
  Order,
  OrderItem,
  Favorite,
  Feedback,
  Coupon,
  SupportRequest,
  Announcement,
  CanteenSettings,
};
