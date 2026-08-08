import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminStaffManagement() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', usn_or_id: '', phone: '', password: '', role: 'canteen_staff' });
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/admin/staff');
    setStaff(data);
  }

  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/staff', form);
      setForm({ name: '', usn_or_id: '', phone: '', password: '', role: 'canteen_staff' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add staff account');
    }
  }

  async function remove(member) {
    if (!confirm(`Remove ${member.name}'s account?`)) return;
    await api.delete(`/admin/staff/${member.id}`);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-paper mb-4">Staff Management</h1>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <form onSubmit={submit} className="card p-4 space-y-3 h-fit">
          <h3 className="font-display text-xl text-paper">Add staff account</h3>
          <input required placeholder="Name" value={form.name} onChange={(e) => update('name', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <input required placeholder="Staff ID (login username)" value={form.usn_or_id} onChange={(e) => update('usn_or_id', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal uppercase" />
          <input required placeholder="Phone (10 digits)" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))} maxLength={10}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <input required type="password" minLength={6} placeholder="Temporary password" value={form.password} onChange={(e) => update('password', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <select value={form.role} onChange={(e) => update('role', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal">
            <option value="canteen_staff">Kitchen Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          {error && <p className="text-chili text-xs">{error}</p>}
          <button type="submit" className="btn-primary text-sm w-full">Add account</button>
        </form>

        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="text-paper font-medium">{s.name} <span className="text-xs text-paper/40">({s.usn_or_id})</span></p>
                <p className="text-xs text-paper/50 capitalize">{s.role.replace('_', ' ')}</p>
              </div>
              <button onClick={() => remove(s)} className="text-chili text-xs px-2">Remove</button>
            </div>
          ))}
          {staff.length === 0 && <p className="text-paper/40 text-sm">No staff accounts yet.</p>}
        </div>
      </div>
    </div>
  );
}
