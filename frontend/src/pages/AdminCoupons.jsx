import React, { useEffect, useState } from 'react';
import api from '../api/client';

const EMPTY = { code: '', discount_percent: '', min_order_amount: '0', expires_at: '' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/coupons');
    setCoupons(data);
  }
  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      code: c.code, discount_percent: c.discount_percent, min_order_amount: c.min_order_amount,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      code: form.code,
      discount_percent: Number(form.discount_percent),
      min_order_amount: Number(form.min_order_amount || 0),
      expires_at: form.expires_at || null,
    };
    try {
      if (editingId) await api.put(`/coupons/${editingId}`, payload);
      else await api.post('/coupons', payload);
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save coupon');
    }
  }

  async function toggleActive(c) {
    await api.put(`/coupons/${c.id}`, { is_active: !c.is_active });
    load();
  }

  async function remove(c) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    await api.delete(`/coupons/${c.id}`);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Coupons</h1>
      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <form onSubmit={submit} className="card p-4 space-y-3 h-fit">
          <h3 className="font-display text-xl text-paper">{editingId ? 'Edit coupon' : 'New coupon'}</h3>
          <input required placeholder="CODE" value={form.code} onChange={(e) => update('code', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal uppercase" />
          <input required type="number" placeholder="Discount %" value={form.discount_percent} onChange={(e) => update('discount_percent', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <input type="number" placeholder="Min order amount" value={form.min_order_amount} onChange={(e) => update('min_order_amount', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <div>
            <label className="block text-xs text-paper/60 mb-1">Expires (optional)</label>
            <input type="date" value={form.expires_at} onChange={(e) => update('expires_at', e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          </div>
          {error && <p className="text-chili text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm flex-1">{editingId ? 'Save' : 'Create'}</button>
            {editingId && <button type="button" onClick={cancelEdit} className="btn-ghost text-sm">Cancel</button>}
          </div>
        </form>

        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-paper font-medium">{c.code} <span className="text-signal text-sm">{c.discount_percent}% off</span></p>
                <p className="text-xs text-paper/50">
                  Min ₹{c.min_order_amount} · {c.expires_at ? `expires ${c.expires_at.slice(0, 10)}` : 'no expiry'} ·{' '}
                  <span className={c.is_active ? 'text-leaf' : 'text-chili'}>{c.is_active ? 'active' : 'inactive'}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(c)} className="btn-ghost text-xs py-1 px-2">{c.is_active ? 'Disable' : 'Enable'}</button>
                <button onClick={() => startEdit(c)} className="btn-ghost text-xs py-1 px-2">Edit</button>
                <button onClick={() => remove(c)} className="text-chili text-xs px-2">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
