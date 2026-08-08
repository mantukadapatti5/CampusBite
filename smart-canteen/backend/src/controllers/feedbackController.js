const { Order, Feedback, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

exports.submitFeedback = async (req, res) => {
  const { order_id, food_rating, service_rating, comment } = req.body;

  const order = await Order.findByPk(order_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Not your order' });
  if (order.status !== 'collected') {
    return res.status(400).json({ error: 'You can only rate an order after it has been collected' });
  }

  const existing = await Feedback.findOne({ where: { order_id } });
  if (existing) return res.status(409).json({ error: 'Feedback already submitted for this order' });

  const feedback = await Feedback.create({
    order_id,
    user_id: req.user.id,
    food_rating,
    service_rating,
    comment,
  });

  res.status(201).json(feedback);
};

// Admin: aggregate ratings for the dashboard
exports.getFeedbackSummary = async (req, res) => {
  const [summary] = await sequelize.query(
    `SELECT
       ROUND(AVG(food_rating)::numeric, 2) AS avg_food_rating,
       ROUND(AVG(service_rating)::numeric, 2) AS avg_service_rating,
       COUNT(*) AS total_reviews
     FROM feedback`,
    { type: QueryTypes.SELECT }
  );

  const recent = await Feedback.findAll({
    order: [['created_at', 'DESC']],
    limit: 10,
  });

  res.json({ summary, recent });
};

exports.reply = async (req, res) => {
  const { admin_reply } = req.body;
  const feedback = await Feedback.findByPk(req.params.id);
  if (!feedback) return res.status(404).json({ error: 'Feedback not found' });
  await feedback.update({ admin_reply });
  res.json(feedback);
};

exports.listAll = async (req, res) => {
  const feedback = await Feedback.findAll({
    include: [{ model: Order, attributes: ['token_number'] }],
    order: [['created_at', 'DESC']],
    limit: 50,
  });
  res.json(feedback);
};
