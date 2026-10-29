import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useSocket } from '../context/SocketContext.jsx';
import FeedbackForm from '../components/FeedbackForm.jsx';

const STEPS = ['pending', 'accepted', 'preparing', 'ready', 'collected'];

const STEP_LABEL = {
  pending: 'Order placed',
  accepted: 'Accepted by canteen',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  collected: 'Collected',
};

// Real browser push notification (Notification API) — fires locally on this
// device when the polled status changes. This is a genuine push mechanism
// that needs no server keys, unlike full FCM/APNs push which would need a
// service-worker + push server setup beyond a college project's scope.
function notifyStatusChange(status, token) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  const messages = {
    accepted: `Order ${token} accepted by the canteen`,
    preparing: `Order ${token} is being prepared`,
    ready: `Order ${token} is ready for pickup!`,
    collected: `Order ${token} marked as collected`,
  };
  if (messages[status]) {
    new Notification('Smart Canteen', { body: messages[status] });
  }
}

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const prevStatus = useRef(null);
  const { socket } = useSocket();

  async function downloadInvoice() {
    const response = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order?.token_number || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let interval;
    async function load() {
      const { data } = await api.get(`/orders/${id}`);
      if (prevStatus.current && prevStatus.current !== data.status) {
        notifyStatusChange(data.status, data.token_number);
      }
      prevStatus.current = data.status;
      setOrder(data);
    }
    load();
    // Real-time updates arrive via WebSocket (see below); this is just a
    // slow safety-net poll in case a socket event gets missed (e.g. a brief
    // disconnect), not the primary update mechanism anymore.
    interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [id]);

  // Live update: the server pushes a socket event the instant kitchen staff
  // change this order's status — no waiting for the next poll.
  useEffect(() => {
    if (!socket) return;
    function onStatus(payload) {
      if (String(payload.id) !== String(id)) return;
      if (prevStatus.current && prevStatus.current !== payload.status) {
        notifyStatusChange(payload.status, order?.token_number);
      }
      prevStatus.current = payload.status;
      setOrder((prev) => (prev ? { ...prev, status: payload.status, counter_number: payload.counter_number } : prev));
    }
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, [socket, id, order?.token_number]);

  if (!order) return <p className="text-paper/50 text-center mt-16">Loading order…</p>;

  const isCancelled = order.status === 'cancelled';
  const currentIndex = STEPS.indexOf(order.status);

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/student/orders" className="text-xs text-paper/50 hover:text-signal">← Back to orders</Link>

      <div className="card p-6 mt-3 text-center">
        <p className="text-xs text-paper/50 mb-2">Your token</p>
        <p className="flap-digit inline-block px-6 py-3 text-4xl mb-4">{order.token_number}</p>
        <p className="text-paper/70">
          Pickup slot <span className="text-signal font-mono">{order.pickupSlot?.slot_date} {order.pickupSlot?.slot_time}</span>
        </p>
        {order.counter_number && (
          <p className="text-paper/70 mt-1">
            Counter <span className="text-signal font-mono">#{order.counter_number}</span>
          </p>
        )}
        {!isCancelled && order.status !== 'ready' && order.status !== 'collected' && (
          <p className="text-xs text-paper/50 mt-2">
            Estimated ready in <span className="text-signal font-mono">~{order.estimated_wait_minutes} min</span>
          </p>
        )}

        <button onClick={downloadInvoice} className="btn-ghost text-xs py-1.5 px-3 mt-3">
          Download invoice (PDF)
        </button>

        {order.qr_code_data_url && (
          <div className="mt-4 flex flex-col items-center">
            <img src={order.qr_code_data_url} alt="Pickup QR code" className="w-32 h-32 rounded-lg bg-paper p-2" />
            <p className="text-[11px] text-paper/40 mt-1">Show this at the counter for quick pickup</p>
          </div>
        )}
      </div>

      {isCancelled ? (
        <div className="card p-4 mt-4 text-center text-chili">This order was cancelled.</div>
      ) : (
        <div className="card p-4 mt-4">
          <div className="flex justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex-1 text-center">
                <div
                  className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                    i <= currentIndex ? 'bg-signal' : 'bg-panel2 border border-white/10'
                  }`}
                />
                <p className={`text-[10px] uppercase font-mono ${i <= currentIndex ? 'text-signal' : 'text-paper/30'}`}>
                  {STEP_LABEL[step]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 mt-4">
        <h3 className="font-display text-lg text-paper mb-2">Items</h3>
        {order.items?.map((oi) => (
          <div key={oi.id} className="flex justify-between text-sm text-paper/70 py-1">
            <span>{oi.menuItem?.name} x{oi.quantity}</span>
            <span className="font-mono">₹{(oi.price_at_order * oi.quantity).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm text-paper/50 pt-2">
          <span>Subtotal</span>
          <span className="font-mono">₹{Number(order.subtotal_amount).toFixed(0)}</span>
        </div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between text-sm text-leaf">
            <span>Discount ({order.coupon_code})</span>
            <span className="font-mono">−₹{Number(order.discount_amount).toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-paper mt-2 pt-2 border-t border-white/10">
          <span>Total</span>
          <span className="font-mono text-signal">₹{Number(order.total_amount).toFixed(0)}</span>
        </div>
      </div>

      {order.status === 'collected' && (
        <FeedbackForm orderId={order.id} existingFeedback={order.feedback} />
      )}
    </div>
  );
}
