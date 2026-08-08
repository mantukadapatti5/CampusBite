import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data));
    api.get('/feedback/summary').then(({ data }) => setFeedback(data));
    api.get('/analytics/demand-forecast').then(({ data }) => setForecast(data));
  }, []);

  if (!stats) return <p className="text-paper/50 text-center mt-16">Loading dashboard…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-paper/50">Orders today</p>
          <p className="font-mono text-3xl text-signal">{stats.orders_today}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-paper/50">Revenue today</p>
          <p className="font-mono text-3xl text-signal">₹{Number(stats.revenue_today).toFixed(0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-paper/50 mb-1">Status breakdown</p>
          <div className="text-xs text-paper/70 space-y-0.5">
            {Object.entries(stats.status_breakdown).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize">{status}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h3 className="font-display text-xl text-paper mb-2">Top selling items</h3>
          {stats.top_selling_items.length === 0 && <p className="text-xs text-paper/40">No sales yet.</p>}
          {stats.top_selling_items.map((row) => (
            <div key={row.menu_item_id} className="flex justify-between text-sm text-paper/70 py-1">
              <span>{row.menuItem?.name}</span>
              <span className="font-mono">{row.dataValues?.total_sold ?? row.total_sold}</span>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h3 className="font-display text-xl text-paper mb-2">Low stock alerts</h3>
          {stats.low_stock_items.length === 0 && <p className="text-xs text-paper/40">Everything well stocked.</p>}
          {stats.low_stock_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span className="text-paper/70">{item.name}</span>
              <span className="font-mono text-chili">{item.stock_quantity} left</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-display text-xl text-paper mb-1">Student feedback</h3>
          <p className="text-[11px] text-paper/40 mb-2">Average across all rated orders</p>
          {feedback && Number(feedback.summary?.total_reviews) > 0 ? (
            <>
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-xs text-paper/50">Food</p>
                  <p className="font-mono text-2xl text-signal">{feedback.summary.avg_food_rating}★</p>
                </div>
                <div>
                  <p className="text-xs text-paper/50">Service</p>
                  <p className="font-mono text-2xl text-signal">{feedback.summary.avg_service_rating}★</p>
                </div>
                <div>
                  <p className="text-xs text-paper/50">Reviews</p>
                  <p className="font-mono text-2xl text-paper">{feedback.summary.total_reviews}</p>
                </div>
              </div>
              {feedback.recent.filter((r) => r.comment).slice(0, 3).map((r) => (
                <p key={r.id} className="text-xs text-paper/60 italic py-1 border-t border-white/5">"{r.comment}"</p>
              ))}
            </>
          ) : (
            <p className="text-xs text-paper/40">No feedback submitted yet.</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-display text-xl text-paper mb-1">Suggested prep for tomorrow</h3>
          <p className="text-[11px] text-paper/40 mb-2">
            Historical-average forecast — not a trained model. Based on the last 30 days of sales.
          </p>
          {forecast && forecast.length > 0 ? (
            forecast.map((row) => (
              <div key={row.menu_item_id} className="flex justify-between text-sm text-paper/70 py-1">
                <span>{row.name}</span>
                <span className="font-mono text-signal">{row.suggested_quantity}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-paper/40">Not enough order history yet to forecast.</p>
          )}
        </div>
      </div>
    </div>
  );
}
