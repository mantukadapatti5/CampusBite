import React, { useEffect, useState } from 'react';
import api from '../api/client';

const EMPTY_FORM = {
  name: '', description: '', price: '', category_id: '', stock_quantity: '',
  is_veg: true, prep_time_minutes: '5', ingredients: '', calories: '', allergens: '',
};

export default function AdminMenuManagement() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/menu?include_unavailable=true');
    setCategories(data.map((c) => ({ id: c.id, name: c.name })));
    setItems(data.flatMap((c) => (c.items || []).map((i) => ({ ...i, category_name: c.name }))));
  }

  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name, description: item.description || '', price: item.price,
      category_id: item.category_id, stock_quantity: item.stock_quantity ?? '',
      is_veg: item.is_veg, prep_time_minutes: item.prep_time_minutes,
      ingredients: item.ingredients || '', calories: item.calories || '', allergens: item.allergens || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      price: Number(form.price),
      category_id: Number(form.category_id),
      stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity),
      prep_time_minutes: Number(form.prep_time_minutes),
      calories: form.calories === '' ? null : Number(form.calories),
    };
    try {
      if (editingId) {
        await api.put(`/menu/items/${editingId}`, payload);
      } else {
        await api.post('/menu/items', payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save item');
    }
  }

  async function toggleAvailable(item) {
    await api.put(`/menu/items/${item.id}`, { is_available: !item.is_available });
    load();
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    await api.delete(`/menu/items/${item.id}`);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Menu Management</h1>

      <div className="grid md:grid-cols-[380px_1fr] gap-6">
        <form onSubmit={submit} className="card p-4 space-y-3 h-fit">
          <h3 className="font-display text-xl text-paper">{editingId ? 'Edit item' : 'Add new item'}</h3>

          <input required placeholder="Name" value={form.name} onChange={(e) => update('name', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />

          <textarea placeholder="Description" value={form.description} onChange={(e) => update('description', e.target.value)} rows={2}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />

          <div className="grid grid-cols-2 gap-2">
            <input required type="number" step="0.01" placeholder="Price (₹)" value={form.price} onChange={(e) => update('price', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
            <select required value={form.category_id} onChange={(e) => update('category_id', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal">
              <option value="">Category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Stock qty (blank = unlimited)" value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
            <input type="number" placeholder="Prep time (min)" value={form.prep_time_minutes} onChange={(e) => update('prep_time_minutes', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          </div>

          <input placeholder="Ingredients (optional)" value={form.ingredients} onChange={(e) => update('ingredients', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />

          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Calories (optional)" value={form.calories} onChange={(e) => update('calories', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
            <input placeholder="Allergens (optional)" value={form.allergens} onChange={(e) => update('allergens', e.target.value)}
              className="bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          </div>

          <label className="flex items-center gap-2 text-sm text-paper/70">
            <input type="checkbox" checked={form.is_veg} onChange={(e) => update('is_veg', e.target.checked)} />
            Vegetarian
          </label>

          {error && <p className="text-chili text-xs">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm flex-1">{editingId ? 'Save changes' : 'Add item'}</button>
            {editingId && <button type="button" onClick={cancelEdit} className="btn-ghost text-sm">Cancel</button>}
          </div>
        </form>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-paper font-medium">
                  {item.name} <span className="text-xs text-paper/40">({item.category_name})</span>
                </p>
                <p className="text-xs text-paper/50">
                  ₹{Number(item.price).toFixed(0)} · stock: {item.stock_quantity ?? '∞'} ·{' '}
                  <span className={item.is_available ? 'text-leaf' : 'text-chili'}>
                    {item.is_available ? 'available' : 'unavailable'}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAvailable(item)} className="btn-ghost text-xs py-1 px-2">
                  {item.is_available ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => startEdit(item)} className="btn-ghost text-xs py-1 px-2">Edit</button>
                <button onClick={() => remove(item)} className="text-chili text-xs px-2">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
