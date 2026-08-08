import api from '../api/client';

const QUEUE_KEY = 'canteen_pending_orders';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueOrder(payload) {
  const queue = readQueue();
  queue.push({ payload, queued_at: new Date().toISOString() });
  writeQueue(queue);
}

export function pendingCount() {
  return readQueue().length;
}

// Attempts to submit every queued order. Stops and re-queues the remainder
// on the first failure (e.g. connection dropped again mid-sync).
export async function syncQueuedOrders(onEach) {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining = [...queue];
  while (remaining.length > 0) {
    const next = remaining[0];
    try {
      const { data } = await api.post('/orders', next.payload);
      remaining.shift();
      writeQueue(remaining);
      if (onEach) onEach({ success: true, order: data });
    } catch (err) {
      // network still down, or the order itself was rejected (e.g. sold
      // out by the time connectivity returned) — either way, stop here
      // and leave it queued rather than silently dropping it.
      if (onEach) onEach({ success: false, error: err.response?.data?.error || 'Sync failed' });
      break;
    }
  }
}
