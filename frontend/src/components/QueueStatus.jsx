import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext.jsx';

const STATUS_LABEL = { open: 'OPEN', busy: 'FILLING', full: 'FULL' };
const STATUS_COLOR = { open: 'text-leaf', busy: 'text-signal', full: 'text-chili' };

export default function QueueStatus() {
  const [slots, setSlots] = useState([]);
  const { socket } = useSocket();

  async function load() {
    try {
      const { data } = await api.get('/orders/queue-status');
      setSlots(data);
    } catch (_) {
      // queue status is best-effort; ignore transient errors
    }
  }

  useEffect(() => {
    load();
    // Real-time via WebSocket below; this is just a slow safety-net poll.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Live: the board refreshes the instant any order is placed or freed up
  // a slot (cancelled/rejected), instead of waiting for the next poll.
  useEffect(() => {
    if (!socket) return;
    socket.on('queue:changed', load);
    return () => socket.off('queue:changed', load);
  }, [socket]);

  return (
    <div className="card p-4 sticky top-4">
      <h3 className="font-display text-xl text-paper tracking-wide mb-1">PICKUP BOARD</h3>
      <p className="text-xs text-paper/50 mb-3">Live slot status — order early to land an open slot.</p>

      {slots.length === 0 && (
        <p className="text-xs text-paper/40">No orders placed yet today. First slot is wide open.</p>
      )}

      <div className="space-y-2">
        {slots.slice(0, 6).map((s) => (
          <div key={s.slot_time} className="flex items-center justify-between">
            <span className="flap-digit px-2 py-1 text-sm">{s.slot_time}</span>
            <div className="flex-1 mx-3 h-1.5 bg-panel2 rounded-full overflow-hidden">
              <div
                className={`h-full ${s.status === 'full' ? 'bg-chili' : s.status === 'busy' ? 'bg-signal' : 'bg-leaf'}`}
                style={{ width: `${Math.min(s.percent_full, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-mono ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
