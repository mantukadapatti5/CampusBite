import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useCart } from '../context/CartContext.jsx';

const STATUS_COLOR = {
  pending: 'text-paper/50',
  accepted: 'text-signal',
  preparing: 'text-signal',
  ready: 'text-leaf',
  collected: 'text-paper/40',
  cancelled: 'text-chili',
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    api.get('/orders/mine').then(({ data }) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  function reorder(order, e) {
    e.preventDefault();
    e.stopPropagation();
    order.items?.forEach((oi) => {
      for (let i = 0; i < oi.quantity; i++) {
        addItem({ id: oi.menuItem.id, name: oi.menuItem.name, price: oi.menuItem.price });
      }
    });
  }

  if (loading) return <p className="text-paper/50 text-center mt-16">Loading orders…</p>;
  if (orders.length === 0) return <p className="text-paper/50 text-center mt-16">No orders yet.</p>;

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <h1 className="font-display text-3xl text-paper mb-4">My Orders</h1>
      {orders.map((o) => (
        <Link key={o.id} to={`/student/orders/${o.id}`} className="card p-4 flex items-center justify-between block hover:border-signal/40">
          <div>
            <p className="flap-digit inline-block px-2 py-1 text-sm mb-1">{o.token_number}</p>
            <p className="text-xs text-paper/50">Slot {o.pickupSlot?.slot_time} · ₹{Number(o.total_amount).toFixed(0)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono uppercase ${STATUS_COLOR[o.status]}`}>{o.status}</span>
            <button onClick={(e) => reorder(o, e)} className="btn-ghost text-xs py-1 px-2">Reorder</button>
          </div>
        </Link>
      ))}
    </div>
  );
}
