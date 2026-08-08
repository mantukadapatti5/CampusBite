const { PickupSlot, CanteenSettings } = require('../models');

const SLOT_CAPACITY = parseInt(process.env.SLOT_CAPACITY || '15', 10);
const SLOT_DURATION_MINUTES = parseInt(process.env.SLOT_DURATION_MINUTES || '10', 10);

async function effectiveSlotCapacity() {
  const settings = await CanteenSettings.findByPk(1);
  if (settings && settings.slot_capacity_override != null) return settings.slot_capacity_override;
  return SLOT_CAPACITY;
}

function todayDateString(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5); // HH:MM
}

function roundUpToSlot(date) {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % SLOT_DURATION_MINUTES;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + (SLOT_DURATION_MINUTES - remainder));
  }
  rounded.setSeconds(0, 0);
  return rounded;
}

/**
 * Finds (or creates) the earliest pickup slot, starting from `startFrom`
 * (defaults to "now"), that still has room. If the current slot is full,
 * walks forward slot by slot until it finds one under capacity. This is
 * what spreads orders across time instead of letting them all pile onto
 * the same few minutes. Passing a future `startFrom` is what powers
 * scheduled orders — same mechanism, just a later starting point.
 */
async function assignNextAvailableSlot(startFrom) {
  let cursor = roundUpToSlot(startFrom ? new Date(startFrom) : new Date());
  const now = new Date();
  if (cursor < now) cursor = roundUpToSlot(now); // never schedule into the past

  // safety cap: don't search more than 100 slots ahead (~16 hours at 10 min slots)
  const capacity = await effectiveSlotCapacity();
  for (let i = 0; i < 100; i++) {
    const slot_date = todayDateString(cursor);
    const slot_time = formatTime(cursor);

    const [slot] = await PickupSlot.findOrCreate({
      where: { slot_date, slot_time },
      defaults: { capacity, order_count: 0 },
    });

    if (slot.order_count < slot.capacity) {
      await slot.increment('order_count');
      await slot.reload();
      return slot;
    }

    cursor = new Date(cursor.getTime() + SLOT_DURATION_MINUTES * 60000);
  }
  throw new Error('No available pickup slot found in the lookahead window');
}

async function getQueueStatus() {
  const slot_date = todayDateString();
  const now = new Date();
  const slots = await PickupSlot.findAll({
    where: { slot_date },
    order: [['slot_time', 'ASC']],
  });

  return slots
    .filter((s) => {
      const [h, m] = s.slot_time.split(':').map(Number);
      const slotDate = new Date();
      slotDate.setHours(h, m, 0, 0);
      return slotDate >= now || slotDate.getTime() > now.getTime() - SLOT_DURATION_MINUTES * 60000;
    })
    .map((s) => ({
      slot_time: s.slot_time,
      order_count: s.order_count,
      capacity: s.capacity,
      percent_full: Math.round((s.order_count / s.capacity) * 100),
      status: s.order_count >= s.capacity ? 'full' : s.order_count / s.capacity > 0.7 ? 'busy' : 'open',
    }));
}

module.exports = { assignNextAvailableSlot, getQueueStatus, SLOT_CAPACITY, SLOT_DURATION_MINUTES };
