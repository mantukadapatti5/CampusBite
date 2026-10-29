const { User } = require('../models');

const POINTS_TO_RUPEE = 10; // 10 reward points = ₹1 wallet credit

exports.getBalance = async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ['wallet_balance', 'reward_points'] });
  res.json(user);
};

// Demo top-up: instantly credits the amount. A real deployment would put a
// payment gateway charge here first and only credit on a successful
// webhook — this endpoint is the "credit after payment" half only.
exports.topUp = async (req, res) => {
  const { amount } = req.body;
  const value = Number(amount);
  if (!value || value <= 0 || value > 5000) {
    return res.status(400).json({ error: 'Enter an amount between ₹1 and ₹5000' });
  }

  const user = await User.findByPk(req.user.id);
  await user.increment('wallet_balance', { by: value });
  await user.reload();
  res.json({ wallet_balance: user.wallet_balance });
};

// Convert reward points into wallet credit. Simple fixed rate — no
// external loyalty platform, just an internal ledger on the User row.
exports.redeemPoints = async (req, res) => {
  const { points } = req.body;
  const value = Number(points);
  if (!value || value <= 0) {
    return res.status(400).json({ error: 'Enter a positive number of points to redeem' });
  }

  const user = await User.findByPk(req.user.id);
  if (user.reward_points < value) {
    return res.status(400).json({ error: `You only have ${user.reward_points} points` });
  }

  const credit = value / POINTS_TO_RUPEE;
  await user.decrement('reward_points', { by: value });
  await user.increment('wallet_balance', { by: credit });
  await user.reload();
  res.json({ wallet_balance: user.wallet_balance, reward_points: user.reward_points });
};
