const { Op, QueryTypes } = require('sequelize');
const { Category, MenuItem, sequelize } = require('../models');

exports.getCategories = async (req, res) => {
  const categories = await Category.findAll({ order: [['sort_order', 'ASC']] });
  res.json(categories);
};

exports.getMenu = async (req, res) => {
  // Supports: ?category=slug  ?search=text  ?veg=true|false
  // ?min_price=  ?max_price=  ?sort=popularity
  // ?include_unavailable=true — used by the admin menu-management screen so
  // disabled items still show up (to be re-enabled), not just live browsing
  const { category, search, veg, min_price, max_price, sort, include_unavailable } = req.query;

  const itemWhere = {};
  if (include_unavailable !== 'true') {
    itemWhere.is_available = true;
  }
  if (search) {
    itemWhere.name = { [Op.iLike]: `%${search}%` };
  }
  if (veg === 'true') itemWhere.is_veg = true;
  if (veg === 'false') itemWhere.is_veg = false;
  if (min_price || max_price) {
    itemWhere.price = {};
    if (min_price) itemWhere.price[Op.gte] = Number(min_price);
    if (max_price) itemWhere.price[Op.lte] = Number(max_price);
  }

  const categories = await Category.findAll({
    order: [['sort_order', 'ASC']],
    include: [{
      model: MenuItem,
      as: 'items',
      where: itemWhere,
      required: false,
    }],
  });

  let filtered = category ? categories.filter((c) => c.slug === category) : categories;

  if (sort === 'popularity') {
    const popularity = await sequelize.query(
      `SELECT menu_item_id, SUM(quantity) AS total_sold FROM order_items GROUP BY menu_item_id`,
      { type: QueryTypes.SELECT }
    );
    const popMap = new Map(popularity.map((p) => [p.menu_item_id, Number(p.total_sold)]));
    filtered = filtered.map((c) => {
      const plain = c.toJSON();
      plain.items = [...plain.items].sort((a, b) => (popMap.get(b.id) || 0) - (popMap.get(a.id) || 0));
      return plain;
    });
  }

  res.json(filtered);
};

exports.createItem = async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateItem = async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Kitchen staff can mark something sold out / back in stock, but full
  // menu editing (price, description, category, etc.) is a manager/admin
  // job — enforced here since the route itself allows all three roles in.
  if (req.user.role === 'canteen_staff') {
    const allowedFields = ['is_available', 'stock_quantity'];
    const attempted = Object.keys(req.body);
    const disallowed = attempted.filter((f) => !allowedFields.includes(f));
    if (disallowed.length > 0) {
      return res.status(403).json({ error: `Kitchen staff can only update availability/stock, not: ${disallowed.join(', ')}` });
    }
  }

  await item.update(req.body);
  res.json(item);
};

exports.deleteItem = async (req, res) => {
  const item = await MenuItem.findByPk(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  await item.destroy();
  res.json({ success: true });
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
