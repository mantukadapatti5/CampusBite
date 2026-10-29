import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  async function saveProfile(e) {
    e.preventDefault();
    setProfileError('');
    setProfileMsg('');
    try {
      await api.put('/auth/profile', { name, email, phone });
      await refreshUser();
      setProfileMsg('Saved.');
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Could not save changes');
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');
    try {
      await api.post('/auth/change-password', { current_password: currentPw, new_password: newPw });
      setPwMsg('Password updated.');
      setCurrentPw('');
      setNewPw('');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Could not change password');
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="font-display text-3xl text-paper mb-2">Profile</h1>

      <form onSubmit={saveProfile} className="card p-4 space-y-3">
        <h3 className="font-display text-lg text-paper">Your details</h3>
        <div>
          <label className="block text-xs text-paper/60 mb-1">USN / Staff ID (can't be changed)</label>
          <input disabled value={user?.usn_or_id || ''} className="w-full bg-panel2/50 border border-white/5 rounded-lg px-3 py-2 text-paper/50 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Email (optional)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        </div>
        {profileError && <p className="text-chili text-xs">{profileError}</p>}
        {profileMsg && <p className="text-leaf text-xs">{profileMsg}</p>}
        <button type="submit" className="btn-primary text-sm w-full">Save changes</button>
      </form>

      <form onSubmit={savePassword} className="card p-4 space-y-3">
        <h3 className="font-display text-lg text-paper">Change password</h3>
        <input type="password" required placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        <input type="password" required minLength={6} placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal" />
        {pwError && <p className="text-chili text-xs">{pwError}</p>}
        {pwMsg && <p className="text-leaf text-xs">{pwMsg}</p>}
        <button type="submit" className="btn-primary text-sm w-full">Update password</button>
      </form>
    </div>
  );
}
