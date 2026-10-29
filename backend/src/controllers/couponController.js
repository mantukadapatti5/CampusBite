const { Coupon } = require('../models');

exports.validateCoupon = async (req, res) => {
  const { code, subtotal } = req.query;
  const coupon = await Coupon.findOne({ where: { code: (code || '').toUpperCase() } });

  if (!coupon || !coupon.is_active) {
    return res.status(404).json({ error: 'Invalid or inactive coupon code' });
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired' });
  }
  if (subtotal != null && Number(subtotal) < Number(coupon.min_order_amount)) {
    return res.status(400).json({ error: `Coupon needs a minimum order of ₹${coupon.min_order_amount}` });
  }

  res.json({
    code: coupon.code,
    discount_percent: coupon.discount_percent,
    min_order_amount: coupon.min_order_amount,
  });
};

// Admin: manage coupons
exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create({
      ...req.body,
      code: req.body.code?.toUpperCase(),
    });
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.listCoupons = async (req, res) => {
  const coupons = await Coupon.findAll({ order: [['created_at', 'DESC']] });
  res.json(coupons);
};

exports.updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  const updates = { ...req.body };
  if (updates.code) updates.code = updates.code.toUpperCase();
  await coupon.update(updates);
  res.json(coupon);
};

exports.deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  await coupon.destroy();
  res.json({ success: true });
};
