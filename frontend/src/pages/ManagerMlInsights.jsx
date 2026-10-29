import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the browser's local time
const addDays = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const levelColor = { high: 'bg-chili', medium: 'bg-signal', low: 'bg-leaf' };
const statusStyle = {
  restock: 'text-chili', tight: 'text-signal', ok: 'text-leaf', unavailable: 'text-paper/30',
};
const statusLabel = { restock: 'Restock!', tight: 'Tight', ok: 'OK', unavailable: 'Off menu' };
const inputCls = 'bg-panel2 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-paper w-full';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-paper/80 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function CrowdChart({ crowd }) {
  const max = Math.max(...crowd.hours.map((h) => h.high), 1);
  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
        <div>
          <h2 className="font-display text-2xl text-paper">Crowd forecast — {DAYS[crowd.dow]} {crowd.date}</h2>
          <p className="text-[11px] text-paper/40">Predicted orders per hour · {crowd.model_name} · typical error ±{crowd.error_rmse} orders</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-paper/50">Expected orders</p>
          <p className="font-mono text-2xl text-signal">{crowd.total_orders}</p>
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-44 mt-3">
        {crowd.hours.map((h) => (
          <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.label}: ~${h.predicted_orders} orders (range ${h.low}–${h.high})`}>
            <span className="text-[10px] font-mono text-paper/70 mb-0.5">{h.predicted_orders}</span>
            <div className={`w-full rounded-t ${levelColor[h.level]}`} style={{ height: `${Math.max(3, (h.predicted_orders / max) * 100)}%` }} />
            <span className="text-[10px] font-mono text-paper/40 mt-1">{String(h.hour).padStart(2, '0')}</span>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
        <div className="bg-panel2 rounded-lg p-3">
          <p className="text-xs text-paper/50">Peak hour</p>
          <p className="font-mono text-lg text-chili">{crowd.peak_label} · ~{crowd.peak_orders} orders</p>
        </div>
        <div className="bg-panel2 rounded-lg p-3">
          <p className="text-xs text-paper/50">Suggested pickup-slot capacity</p>
          <p className="font-mono text-lg text-signal">{crowd.suggested_slot_capacity} per {crowd.slot_minutes}-min slot</p>
        </div>
        <div className="bg-panel2 rounded-lg p-3">
          <p className="text-xs text-paper/50">Current setting</p>
          <p className="font-mono text-lg text-paper">
            {crowd.current_slot_capacity} per slot
            <span className="text-xs text-paper/50 ml-2">
              {crowd.current_slot_capacity < crowd.suggested_slot_capacity ? '→ may be too low for the peak' : '→ enough for the peak'}
            </span>
          </p>
        </div>
      </div>
      <p className="text-[11px] text-paper/40 mt-2">
        Colours: <span className="text-chili">red = high</span>, <span className="text-signal">amber = medium</span>, <span className="text-leaf">green = low</span> (relative to the busiest hour of the day).
      </p>
    </div>
  );
}

function DemandTable({ demand }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? demand.items : demand.items.slice(0, 12);
  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
        <div>
          <h2 className="font-display text-2xl text-paper">Demand forecast — {DAYS[demand.dow]} {demand.date}</h2>
          <p className="text-[11px] text-paper/40">Predicted units per item · {demand.model_name} · typical error ±{demand.error_rmse} units · assumed temperature {Number(demand.temp_c).toFixed(0)}°C</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-paper/50">Total units / items to restock</p>
          <p className="font-mono text-2xl text-signal">{demand.total_units} <span className="text-chili text-lg">/ {demand.restock_count}</span></p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-paper/50 border-b border-white/10">
              <th className="py-1.5 pr-2">Item</th>
              <th className="pr-2 text-right">Predicted</th>
              <th className="pr-2 text-right">Range</th>
              <th className="pr-2 text-right">Prep this many</th>
              <th className="pr-2 text-right">In stock</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.menu_item_id} className="border-b border-white/5 text-paper/80">
                <td className="py-1.5 pr-2">{r.name}</td>
                <td className="pr-2 text-right font-mono">{r.predicted_quantity}</td>
                <td className="pr-2 text-right font-mono text-paper/50">{r.low}–{r.high}</td>
                <td className="pr-2 text-right font-mono text-signal">{r.suggested_quantity}</td>
                <td className="pr-2 text-right font-mono">{r.stock ?? '—'}</td>
                <td className={`text-right text-xs font-semibold ${statusStyle[r.status]}`}>
                  {statusLabel[r.status]}{r.shortfall > 0 && r.status !== 'unavailable' ? ` (−${r.shortfall})` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {demand.items.length > 12 && (
        <button className="btn-ghost text-xs mt-3" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show top 12 only' : `Show all ${demand.items.length} items`}
        </button>
      )}
      <p className="text-[11px] text-paper/40 mt-2">“Prep this many” = predicted units + a small safety buffer. “Restock” means current stock is below the predicted demand.</p>
    </div>
  );
}

function WaitSimulator() {
  const [f, setF] = useState({ orders_ahead: 6, items_count: 2, total_qty: 3, max_prep_min: 6, hour: 13, dow: 2 });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const run = async () => {
    setBusy(true);
    try { const { data } = await api.post('/ml/wait-time', f); setRes(data); } finally { setBusy(false); }
  };
  useEffect(() => { run(); /* first prediction on load */ }, []); // eslint-disable-line

  const field = (label, key, min, max) => (
    <div>
      <label className="text-[11px] text-paper/50">{label}</label>
      <input type="number" min={min} max={max} className={inputCls} value={f[key]} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <div className="card p-4 mb-4">
      <h2 className="font-display text-2xl text-paper">Wait-time predictor</h2>
      <p className="text-[11px] text-paper/40 mb-3">This is the model students’ order-tracking page uses. Try different queue situations:</p>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {field('Orders ahead', 'orders_ahead', 0, 60)}
        {field('Items in order', 'items_count', 1, 10)}
        {field('Total quantity', 'total_qty', 1, 30)}
        {field('Longest prep (min)', 'max_prep_min', 1, 30)}
        <div>
          <label className="text-[11px] text-paper/50">Hour</label>
          <select className={inputCls} value={f.hour} onChange={(e) => set('hour', e.target.value)}>
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-paper/50">Day</label>
          <select className={inputCls} value={f.dow} onChange={(e) => set('dow', e.target.value)}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
      </div>
      <button className="btn-primary mt-3" onClick={run} disabled={busy}>{busy ? 'Predicting…' : 'Predict wait time'}</button>
      {res && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-panel2 rounded-lg p-3">
            <p className="text-xs text-paper/50">ML prediction ({res.model_name})</p>
            <p className="font-mono text-3xl text-signal">{res.minutes} min <span className="text-xs text-paper/40">±{res.error_rmse}</span></p>
          </div>
          <div className="bg-panel2 rounded-lg p-3">
            <p className="text-xs text-paper/50">Old fixed rule (3 min × orders ahead + prep)</p>
            <p className="font-mono text-3xl text-paper/60">{res.rule_based_minutes} min</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({ taskKey, t, sources }) {
  const download = async (name) => {
    const { data } = await api.get(`/ml/dataset/${name}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const dsName = { crowd: 'hourly_orders', demand: 'daily_item_sales', wait: 'order_wait_times' }[taskKey];
  const maxImp = Math.max(...t.importances.map((i) => i.importance), 0.0001);
  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-display text-xl text-paper">{t.title}</h3>
        <span className="text-[10px] bg-leaf/20 text-leaf px-2 py-0.5 rounded-full">in use: {t.results[t.selected].name}</span>
      </div>
      <p className="text-[11px] text-paper/40 mb-2">Predicts {t.target} · {t.rows.toLocaleString()} training rows · {t.split}</p>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="text-left text-paper/50 border-b border-white/10">
            <th className="py-1">Model (tested on unseen data)</th><th className="text-right">MAE</th><th className="text-right">RMSE</th><th className="text-right">R²</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(t.results).map(([id, r]) => (
            <tr key={id} className={`border-b border-white/5 ${id === t.selected ? 'text-signal font-semibold' : 'text-paper/70'}`}>
              <td className="py-1 pr-2">{id === t.selected ? '★ ' : ''}{r.name}</td>
              <td className="text-right font-mono">{r.mae}</td>
              <td className="text-right font-mono">{r.rmse}</td>
              <td className="text-right font-mono">{r.r2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-leaf mb-3">{t.improvement_vs_baseline_pct}% lower error (RMSE) than the old method</p>

      <p className="text-[11px] text-paper/50 mb-1">What the model relies on most</p>
      {t.importances.slice(0, 5).map((i) => (
        <div key={i.feature} className="flex items-center gap-2 text-[11px] mb-0.5">
          <span className="w-28 text-paper/60 truncate">{i.feature}</span>
          <div className="flex-1 bg-panel2 rounded h-2"><div className="bg-signal h-2 rounded" style={{ width: `${(i.importance / maxImp) * 100}%` }} /></div>
          <span className="font-mono text-paper/50 w-9 text-right">{Math.round(i.importance * 100)}%</span>
        </div>
      ))}

      <div className="flex justify-between items-center mt-3">
        <span className="text-[11px] text-paper/40">
          Data: {(sources.synthetic_rows[dsName] || 0).toLocaleString()} generated rows
          {(sources.live_rows[dsName] || 0) > 0 ? ` + ${sources.live_rows[dsName].toLocaleString()} live rows` : ''}
        </span>
        <button className="btn-ghost text-xs" onClick={() => download(dsName)}>⬇ Dataset CSV</button>
      </div>
    </div>
  );
}

export default function ManagerMlInsights() {
  const [date, setDate] = useState(addDays(todayStr(), 1));
  const [ctx, setCtx] = useState({ holiday: false, exam: false, rain: false });
  const [crowd, setCrowd] = useState(null);
  const [demand, setDemand] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [training, setTraining] = useState(false);
  const [useLive, setUseLive] = useState(true);
  const [msg, setMsg] = useState('');

  const loadForecasts = useCallback(async () => {
    const params = { date, holiday: ctx.holiday ? 1 : 0, exam: ctx.exam ? 1 : 0, rain: ctx.rain ? 1 : 0 };
    try {
      const [c, d] = await Promise.all([api.get('/ml/crowd-forecast', { params }), api.get('/ml/demand-forecast', { params })]);
      setCrowd(c.data); setDemand(d.data); setError('');
    } catch (e) { setError(e.response?.data?.error || 'Could not load forecasts.'); }
  }, [date, ctx]);

  const loadOverview = useCallback(() => api.get('/ml/overview').then(({ data }) => setOverview(data)).catch(() => {}), []);

  useEffect(() => { loadForecasts(); }, [loadForecasts]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const retrain = async () => {
    setTraining(true); setMsg('');
    try {
      const { data } = await api.post('/ml/retrain', { use_live_data: useLive });
      setOverview(data);
      await loadForecasts();
      setMsg(`Models retrained in ${data.training_seconds}s.`);
    } catch (e) { setMsg(e.response?.data?.error || 'Retraining failed.'); } finally { setTraining(false); }
  };

  const today = todayStr();
  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-1">ML Insights</h1>
      <p className="text-xs text-paper/50 mb-4">
        Machine-learning forecasts for crowd, demand and waiting time — trained on generated canteen datasets and (optionally) your live orders.
      </p>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] text-paper/50">Forecast date</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className={date === today ? 'btn-primary' : 'btn-ghost'} onClick={() => setDate(today)}>Today</button>
            <button className={date === addDays(today, 1) ? 'btn-primary' : 'btn-ghost'} onClick={() => setDate(addDays(today, 1))}>Tomorrow</button>
          </div>
          <div className="flex flex-wrap gap-4 pb-1.5">
            <Toggle label="Holiday" checked={ctx.holiday} onChange={(v) => setCtx({ ...ctx, holiday: v })} />
            <Toggle label="Exam period" checked={ctx.exam} onChange={(v) => setCtx({ ...ctx, exam: v })} />
            <Toggle label="Rainy day" checked={ctx.rain} onChange={(v) => setCtx({ ...ctx, rain: v })} />
          </div>
        </div>
        <p className="text-[11px] text-paper/40 mt-2">Tick what you expect for that day (e.g. rain, exams, a college holiday) and both forecasts below update.</p>
      </div>

      {error && <p className="text-chili text-sm mb-3">{error}</p>}
      {!crowd && !error && <p className="text-paper/50 text-center my-8">Loading forecasts…</p>}
      {crowd && <CrowdChart crowd={crowd} />}
      {demand && <DemandTable demand={demand} />}
      <WaitSimulator />

      <div className="flex flex-wrap justify-between items-center gap-3 mt-6 mb-2">
        <div>
          <h2 className="font-display text-2xl text-paper">Models & datasets</h2>
          {overview && <p className="text-[11px] text-paper/40">Last trained {new Date(overview.trained_at).toLocaleString()} · took {overview.training_seconds}s</p>}
        </div>
        <div className="flex items-center gap-3">
          <Toggle label="Include live orders" checked={useLive} onChange={setUseLive} />
          <button className="btn-primary" onClick={retrain} disabled={training}>{training ? 'Training…' : '🔁 Retrain models'}</button>
        </div>
      </div>
      {msg && <p className="text-xs text-leaf mb-2">{msg}</p>}

      {overview && (
        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          {['crowd', 'demand', 'wait'].map((k) => <ModelCard key={k} taskKey={k} t={overview.tasks[k]} sources={overview.data_sources} />)}
        </div>
      )}

      <div className="card p-4 text-xs text-paper/60 space-y-2">
        <h3 className="font-display text-xl text-paper">How it works</h3>
        <p><span className="text-paper">Algorithms:</span> every task trains a Random Forest (an ensemble of decision trees on bootstrap samples) and a Ridge Regression, and compares both with the old non-ML method. The one with the lowest error on held-out data is used.</p>
        <p><span className="text-paper">Evaluation:</span> 20% of the data is hidden during training (whole days for crowd and demand). MAE and RMSE are average errors in the task’s own units; R² tells how much of the variation is explained (1.0 = perfect).</p>
        <p><span className="text-paper">Data:</span> the starter datasets are generated by a simulator of a year of canteen activity (weekdays, exams, holidays, rain, temperature, queue and staffing effects) using the real menu. “Retrain” can also add your live order history. Accuracy on the generated data shows the pipeline works — accuracy on your real canteen will only be known once enough real orders have been collected.</p>
      </div>
    </div>
  );
}
