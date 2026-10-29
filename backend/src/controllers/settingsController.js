const { CanteenSettings } = require('../models');

async function getOrCreateSettings() {
  const [settings] = await CanteenSettings.findOrCreate({ where: { id: 1 }, defaults: {} });
  return settings;
}

exports.get = async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
};

exports.update = async (req, res) => {
  const settings = await getOrCreateSettings();
  const { opens_at, closes_at, tax_percent, slot_capacity_override } = req.body;
  const updates = {};
  if (opens_at) updates.opens_at = opens_at;
  if (closes_at) updates.closes_at = closes_at;
  if (tax_percent !== undefined) updates.tax_percent = Number(tax_percent);
  if (slot_capacity_override !== undefined) {
    updates.slot_capacity_override = slot_capacity_override === '' ? null : Number(slot_capacity_override);
  }
  await settings.update(updates);
  res.json(settings);
};
