import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeForRole } from '../utils/roleHome.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usn, setUsn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(usn.trim(), password);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 card p-6">
      <h1 className="font-display text-3xl text-paper mb-1">Welcome back</h1>
      <p className="text-sm text-paper/60 mb-6">Log in with your USN or staff ID.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-paper/60 mb-1">USN / Staff ID</label>
          <input
            required
            value={usn}
            onChange={(e) => setUsn(e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal uppercase"
            placeholder="e.g. 4AT22CS000"
          />
        </div>
        <div>
          <label className="block text-xs text-paper/60 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-chili text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="flex justify-between mt-4 text-xs">
        <Link to="/register" className="text-signal">Create account</Link>
        <Link to="/forgot-password" className="text-paper/50 hover:text-signal">Forgot password?</Link>
      </div>
      <p className="text-xs text-paper/30 mt-3">
        Demo: 4AT22CS000 / password123 (also STAFF001, ADMIN001)
      </p>
    </div>
  );
}
