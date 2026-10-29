import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext.jsx';

const NEXT_STATUS = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'collected',
};

const ACTION_LABEL = {
  pending: 'Accept',
  accepted: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Mark collected',
};

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [tokenSearch, setTokenSearch] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [newOrderPing, setNewOrderPing] = useState(false);
  const { socket, connected } = useSocket();

  async function load() {
    const { data } = await api.get('/orders/active');
    setOrders(data);
  }

  useEffect(() => {
    load();
    // Real-time via WebSocket below; this is just a slow safety-net poll.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live: new orders and status changes push instantly instead of waiting
  // for the next poll — this is the "new order alert" from the kitchen
  // module, done for real with a socket event instead of a fake beep.
  useEffect(() => {
    if (!socket) return;
    function onNewOrder() {
      setNewOrderPing(true);
      setTimeout(() => setNewOrderPing(false), 3000);
      load();
    }
    function onUpdated() {
      load();
    }
    socket.on('order:new', onNewOrder);
    socket.on('order:updated', onUpdated);
    return () => {
      socket.off('order:new', onNewOrder);
      socket.off('order:updated', onUpdated);
    };
  }, [socket]);

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    let counter_number;
    if (next === 'ready') {
      counter_number = prompt('Assign a counter number for pickup:', '1');
      if (counter_number === null) return; // cancelled prompt
    }
    await api.patch(`/orders/${order.id}/status`, { status: next, counter_number: counter_number ? Number(counter_number) : undefined });
    load();
    if (searchResult?.id === order.id) lookupToken();
  }

  async function cancel(order) {
    await api.patch(`/orders/${order.id}/status`, { status: 'cancelled' });
    load();
    if (searchResult?.id === order.id) setSearchResult(null);
  }

  async function lookupToken() {
    setSearchError('');
    if (!tokenSearch.trim()) return;
    try {
      const { data } = await api.get(`/orders/token/${tokenSearch.trim().toUpperCase()}`);
      setSearchResult(data);
    } catch (err) {
      setSearchResult(null);
      setSearchError(err.response?.data?.error || 'Order not found');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-display text-3xl text-paper">Kitchen Queue</h1>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-leaf' : 'bg-chili'}`} title={connected ? 'Live' : 'Reconnecting…'} />
        {newOrderPing && (
          <span className="text-xs font-mono text-signal animate-pulse">● New order!</span>
        )}
      </div>

      <div className="card p-4 mb-6">
        <p className="text-xs text-paper/60 mb-2">
          Look up by token (scan the student's QR with any QR reader app, then type/paste the token here)
        </p>
        <div className="flex gap-2">
          <input
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupToken()}
            placeholder="e.g. T-284"
            className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal uppercase"
          />
          <button onClick={lookupToken} className="btn-ghost text-xs px-3">Find</button>
        </div>
        {searchError && <p className="text-chili text-xs mt-2">{searchError}</p>}
        {searchResult && (
          <div className="mt-3 p-3 bg-panel2 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="flap-digit px-2 py-1 text-sm">{searchResult.token_number}</span>
              <span className="text-xs uppercase font-mono text-signal">{searchResult.status}</span>
            </div>
            <ul className="text-sm text-paper/70 mb-2">
              {searchResult.items?.map((oi) => (
                <li key={oi.id}>{oi.menuItem?.name} x{oi.quantity}</li>
              ))}
            </ul>
            {NEXT_STATUS[searchResult.status] && (
              <button onClick={() => advance(searchResult)} className="btn-primary text-xs py-1.5 w-full">
                {ACTION_LABEL[searchResult.status]}
              </button>
            )}
          </div>
        )}
      </div>

      {orders.length === 0 && <p className="text-paper/50">No active orders right now.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((o) => (
          <div key={o.id} className={`card p-4 ${o.is_delayed || o.is_missed_pickup ? 'border-chili/60' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="flap-digit px-2 py-1 text-sm">{o.token_number}</span>
              <span className="text-xs font-mono text-paper/50">Slot {o.pickupSlot?.slot_time}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-mono ${o.is_delayed || o.is_missed_pickup ? 'text-chili' : 'text-paper/40'}`}>
                {o.is_missed_pickup
                  ? `MISSED PICKUP — ready ${o.elapsed_minutes}m ago`
                  : `${o.elapsed_minutes}m elapsed${o.is_delayed ? ' — DELAYED' : ''}`}
              </span>
              {o.counter_number && <span className="text-[11px] font-mono text-signal">Counter {o.counter_number}</span>}
            </div>
            <ul className="text-sm text-paper/70 mb-3">
              {o.items?.map((oi) => (
                <li key={oi.id}>
                  {oi.menuItem?.name} x{oi.quantity}
                  {oi.special_instructions && (
                    <span className="block text-[11px] text-signal/80">↳ {oi.special_instructions}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs uppercase font-mono text-signal mb-3">{o.status}</p>
            <div className="flex gap-2">
              {NEXT_STATUS[o.status] && (
                <button onClick={() => advance(o)} className="btn-primary text-xs py-1.5 flex-1">
                  {ACTION_LABEL[o.status]}
                </button>
              )}
              {o.status !== 'ready' && (
                <button onClick={() => cancel(o)} className="btn-ghost text-xs py-1.5">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
