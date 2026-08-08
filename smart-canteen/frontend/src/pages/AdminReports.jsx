import React, { useEffect, useState } from 'react';
import api from '../api/client';

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
];

export default function AdminReports() {
  const [report, setReport] = useState(null);
  const [days, setDays] = useState(30);

  async function load(range) {
    const end = new Date();
    const start = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
    const { data } = await api.get('/admin/reports', {
      params: { start: start.toISOString(), end: end.toISOString() },
    });
    setReport(data);
  }

  useEffect(() => { load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxRevenue = report ? Math.max(...report.daily.map((d) => Number(d.revenue)), 1) : 1;

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Reports</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`text-xs py-1.5 px-3 rounded-lg border ${days === p.days ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!report ? (
        <p className="text-paper/50 text-sm">Loading…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="card p-4">
              <p className="text-xs text-paper/50">Total orders (range)</p>
              <p className="font-mono text-3xl text-signal">{report.totals.orders}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-paper/50">Total revenue (range)</p>
              <p className="font-mono text-3xl text-signal">₹{report.totals.revenue.toFixed(0)}</p>
            </div>
          </div>

          <div className="card p-4 mb-4">
            <h3 className="font-display text-xl text-paper mb-3">Daily revenue</h3>
            {report.daily.length === 0 ? (
              <p className="text-xs text-paper/40">No orders in this range.</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {report.daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day}: ₹${d.revenue}`}>
                    <div
                      className="w-full bg-signal/70 rounded-t"
                      style={{ height: `${(Number(d.revenue) / maxRevenue) * 100}%`, minHeight: 2 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-display text-xl text-paper mb-2">Least ordered items</h3>
            <p className="text-[11px] text-paper/40 mb-2">Candidates for menu review or promotion</p>
            {report.least_ordered_items.length === 0 ? (
              <p className="text-xs text-paper/40">Not enough data yet.</p>
            ) : (
              report.least_ordered_items.map((row) => (
                <div key={row.menu_item_id} className="flex justify-between text-sm text-paper/70 py-1">
                  <span>{row.menuItem?.name}</span>
                  <span className="font-mono">{row.dataValues?.total_sold ?? row.total_sold} sold</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
