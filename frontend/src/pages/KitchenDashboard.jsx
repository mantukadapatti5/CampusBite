import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function KitchenDashboard() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api.get('/admin/kitchen-dashboard').then(({ data }) => setCounts(data));
  }, []);

  if (!counts) return <p className="text-paper/50 text-center mt-16">Loading…</p>;

  const cards = [
    { label: 'Pending', value: counts.pending, color: 'text-paper' },
    { label: 'Preparing', value: counts.preparing, color: 'text-signal' },
    { label: 'Ready', value: counts.ready, color: 'text-leaf' },
    { label: 'Collected today', value: counts.collected, color: 'text-paper/60' },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Kitchen Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4 text-center">
            <p className="text-xs text-paper/50 mb-1">{c.label}</p>
            <p className={`font-mono text-3xl ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-paper/40 mt-4">
        Revenue and financial figures aren't shown here — that's a Manager/Admin view.
      </p>
    </div>
  );
}
