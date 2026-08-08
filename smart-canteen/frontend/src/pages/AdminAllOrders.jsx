import React, { useEffect, useState } from 'react';
import api from '../api/client';

const STATUS_COLOR = {
  pending: 'text-paper/50',
  accepted: 'text-signal',
  preparing: 'text-signal',
  ready: 'text-leaf',
  collected: 'text-paper/40',
  cancelled: 'text-chili',
};

export default function AdminAllOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (start) params.start = start;
    if (end) params.end = end;
    const { data } = await api.get('/orders/all', { params });
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">All Orders</h1>

      <div className="card p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-paper/60 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="collected">Collected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">From</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
            className="bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">To</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
            className="bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-paper outline-none focus:border-signal" />
        </div>
        <button onClick={load} className="btn-primary text-xs px-4 py-1.5">Filter</button>
      </div>

      {loading ? (
        <p className="text-paper/50 text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-paper font-medium">
                  {o.token_number}{' '}
                  <span className="text-xs text-paper/40">
                    {o.is_manual_entry ? o.walk_in_name : `${o.user?.name} (${o.user?.usn_or_id})`}
                  </span>
                </p>
                <p className="text-xs text-paper/50">
                  ₹{Number(o.total_amount).toFixed(0)} · {o.payment_method} ({o.payment_status}) · {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
              <span className={`text-xs font-mono uppercase ${STATUS_COLOR[o.status]}`}>{o.status}</span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-paper/40 text-sm">No orders match these filters.</p>}
        </div>
      )}
    </div>
  );
}
