const { SupportRequest, User } = require('../models');

exports.submit = async (req, res) => {
  const { type, message } = req.body;
  if (!['suggestion', 'issue'].includes(type) || !message) {
    return res.status(400).json({ error: 'type (suggestion|issue) and message are required' });
  }
  const request = await SupportRequest.create({ user_id: req.user.id, type, message });
  res.status(201).json(request);
};

exports.myRequests = async (req, res) => {
  const requests = await SupportRequest.findAll({
    where: { user_id: req.user.id },
    order: [['created_at', 'DESC']],
  });
  res.json(requests);
};

// Admin: view all open/resolved requests
exports.list = async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const requests = await SupportRequest.findAll({
    where,
    include: [{ model: User, attributes: ['name', 'usn_or_id'] }],
    order: [['created_at', 'DESC']],
  });
  res.json(requests);
};

exports.resolve = async (req, res) => {
  const request = await SupportRequest.findByPk(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  await request.update({ status: 'resolved' });
  res.json(request);
};
