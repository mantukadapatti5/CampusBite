import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminSupportRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('open');

  async function load() {
    const { data } = await api.get('/support', { params: filter ? { status: filter } : {} });
    setRequests(data);
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function resolve(req) {
    await api.patch(`/support/${req.id}/resolve`);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Suggestions & Issues</h1>

      <div className="flex gap-2 mb-4">
        {['open', 'resolved', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`text-xs py-1.5 px-3 rounded-lg border capitalize ${filter === s ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="card p-3 flex items-center justify-between">
            <div>
              <p className="text-paper text-sm">
                <span className={`text-xs font-mono uppercase ${r.type === 'issue' ? 'text-chili' : 'text-signal'}`}>{r.type}</span>
                {' — '}{r.message}
              </p>
              <p className="text-xs text-paper/40 mt-0.5">
                {r.User?.name} ({r.User?.usn_or_id}) · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            {r.status === 'open' && (
              <button onClick={() => resolve(r)} className="btn-ghost text-xs px-3 py-1">Mark resolved</button>
            )}
            {r.status === 'resolved' && <span className="text-xs text-leaf">Resolved</span>}
          </div>
        ))}
        {requests.length === 0 && <p className="text-paper/40 text-sm">Nothing here.</p>}
      </div>
    </div>
  );
}
