const mlService = require('../ml/mlService');
const mlData = require('../ml/mlData');
const { SLOT_CAPACITY, SLOT_DURATION_MINUTES } = require('../utils/pickupSlotService');

const flag = (v) => v === '1' || v === 'true' || v === true;
const ctxFrom = (q) => ({ holiday: flag(q.holiday), exam: flag(q.exam), rain: flag(q.rain) });

exports.overview = (req, res, next) => {
  try { res.json(mlService.overview()); } catch (e) { next(e); }
};

exports.crowdForecast = (req, res, next) => {
  try {
    const out = mlService.predictCrowd(req.query.date, ctxFrom(req.query));
    out.current_slot_capacity = SLOT_CAPACITY;
    out.slot_minutes = SLOT_DURATION_MINUTES;
    res.json(out);
  } catch (e) { next(e); }
};

exports.demandForecast = async (req, res, next) => {
  try {
    const items = await mlData.loadMenuForForecast();
    const temp = req.query.temp_c !== undefined && req.query.temp_c !== '' ? Number(req.query.temp_c) : null;
    res.json(mlService.predictDemand(items, req.query.date, ctxFrom(req.query), Number.isFinite(temp) ? temp : null));
  } catch (e) { next(e); }
};

exports.waitTime = (req, res, next) => {
  try {
    const b = req.body || {};
    const num = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
    res.json(mlService.predictWait({
      orders_ahead: num(b.orders_ahead, 0, 0, 60), items_count: num(b.items_count, 1, 1, 10),
      total_qty: num(b.total_qty, 1, 1, 30), max_prep_min: num(b.max_prep_min, 5, 1, 30),
      hour: b.hour != null && b.hour !== '' ? num(b.hour, 12, 0, 23) : undefined,
      dow: b.dow != null && b.dow !== '' ? num(b.dow, 1, 0, 6) : undefined,
    }));
  } catch (e) { next(e); }
};

exports.retrain = async (req, res, next) => {
  try {
    const useLive = req.body?.use_live_data !== false;
    res.json(await mlService.retrain({ useLiveData: useLive }));
  } catch (e) {
    if (/already running/i.test(e.message)) return res.status(409).json({ error: e.message });
    next(e);
  }
};

exports.downloadDataset = (req, res) => {
  const file = mlService.datasetPath(req.params.name);
  if (!file) return res.status(404).json({ error: 'Unknown dataset' });
  res.download(file, `${req.params.name}.csv`);
};
