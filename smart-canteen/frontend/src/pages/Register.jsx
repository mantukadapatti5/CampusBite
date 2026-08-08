import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeForRole } from '../utils/roleHome.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', usn_or_id: '', phone: '', password: '', role: 'student', referral_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register({ ...form, usn_or_id: form.usn_or_id.trim() });
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 card p-6">
      <h1 className="font-display text-3xl text-paper mb-1">Create account</h1>
      <p className="text-sm text-paper/60 mb-6">Register with your USN / staff ID.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-paper/60 mb-1">Full name</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">USN / Staff ID (this is your login username)</label>
          <input required value={form.usn_or_id} onChange={(e) => update('usn_or_id', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal uppercase"
            placeholder="e.g. 4AT22CS000" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Phone number (used only for password reset)</label>
          <input required value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal"
            placeholder="10-digit number" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">I am a</label>
          <select value={form.role} onChange={(e) => update('role', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal">
            <option value="student">Student</option>
            <option value="staff">Staff / Faculty</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Password (min 6 characters)</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal" />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Referral code (optional — earns you both bonus points)</label>
          <input value={form.referral_code} onChange={(e) => update('referral_code', e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal uppercase"
            placeholder="e.g. friend's referral code" />
        </div>

        {error && <p className="text-chili text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="text-xs text-paper/50 mt-4">
        Already registered? <Link to="/login" className="text-signal">Log in</Link>
      </p>
    </div>
  );
}
