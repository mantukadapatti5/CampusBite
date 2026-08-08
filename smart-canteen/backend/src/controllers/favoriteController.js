const { Favorite, MenuItem } = require('../models');

exports.getMyFavorites = async (req, res) => {
  const favorites = await Favorite.findAll({
    where: { user_id: req.user.id },
    include: [{ model: MenuItem, as: 'menuItem' }],
  });
  res.json(favorites.map((f) => f.menuItem));
};

exports.toggleFavorite = async (req, res) => {
  const { menu_item_id } = req.body;

  const existing = await Favorite.findOne({
    where: { user_id: req.user.id, menu_item_id },
  });

  if (existing) {
    await existing.destroy();
    return res.json({ favorited: false });
  }

  await Favorite.create({ user_id: req.user.id, menu_item_id });
  res.json({ favorited: true });
};
