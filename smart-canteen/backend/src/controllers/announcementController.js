const { Announcement } = require('../models');

exports.listActive = async (req, res) => {
  const announcements = await Announcement.findAll({
    where: { is_active: true },
    order: [['created_at', 'DESC']],
    limit: 3,
  });
  res.json(announcements);
};

exports.listAll = async (req, res) => {
  const announcements = await Announcement.findAll({ order: [['created_at', 'DESC']] });
  res.json(announcements);
};

exports.create = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  const announcement = await Announcement.create({ message });
  res.status(201).json(announcement);
};

exports.deactivate = async (req, res) => {
  const announcement = await Announcement.findByPk(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
  await announcement.update({ is_active: false });
  res.json({ success: true });
};
