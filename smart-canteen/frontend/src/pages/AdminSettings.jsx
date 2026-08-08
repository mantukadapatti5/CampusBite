import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  async function loadSettings() {
    const { data } = await api.get('/settings');
    setSettings(data);
  }
  async function loadAnnouncements() {
    const { data } = await api.get('/announcements');
    setAnnouncements(data);
  }

  useEffect(() => { loadSettings(); loadAnnouncements(); }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    await api.put('/settings', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function postAnnouncement(e) {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    await api.post('/announcements', { message: newAnnouncement.trim() });
    setNewAnnouncement('');
    loadAnnouncements();
  }

  async function deactivate(a) {
    await api.patch(`/announcements/${a.id}/deactivate`);
    loadAnnouncements();
  }

  if (!settings) return <p className="text-paper/50 text-center mt-16">Loading…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-display text-3xl text-paper">Settings</h1>

      <form onSubmit={save} className="card p-4 space-y-3">
        <h3 className="font-display text-lg text-paper">Canteen configuration</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-paper/60 mb-1">Opens at</label>
            <input type="time" value={settings.opens_at} onChange={(e) => update('opens_at', e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          </div>
          <div>
            <label className="block text-xs text-paper/60 mb-1">Closes at</label>
            <input type="time" value={settings.closes_at} onChange={(e) => update('closes_at', e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Tax (%) — applied to every order total</label>
          <input type="number" step="0.1" value={settings.tax_percent} onChange={(e) => update('tax_percent', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Pickup slot capacity override (blank = default)</label>
          <input type="number" value={settings.slot_capacity_override ?? ''} onChange={(e) => update('slot_capacity_override', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        </div>
        <button type="submit" className="btn-primary text-sm w-full">Save settings</button>
        {saved && <p className="text-leaf text-xs text-center">Saved.</p>}
      </form>

      <div className="card p-4">
        <h3 className="font-display text-lg text-paper mb-2">Announcements</h3>
        <form onSubmit={postAnnouncement} className="flex gap-2 mb-3">
          <input value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} placeholder="Broadcast a message to all students"
            className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
          <button type="submit" className="btn-primary text-xs px-3">Post</button>
        </form>
        <div className="space-y-1">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm py-1">
              <span className={a.is_active ? 'text-paper/80' : 'text-paper/30 line-through'}>{a.message}</span>
              {a.is_active && <button onClick={() => deactivate(a)} className="text-chili text-xs px-2">Remove</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
