import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [error, setError] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function topUp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/wallet/topup', { amount: Number(amount) });
      await refreshUser();
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Top-up failed');
    } finally {
      setLoading(false);
    }
  }

  async function redeem(e) {
    e.preventDefault();
    setRedeemError('');
    try {
      await api.post('/wallet/redeem-points', { points: Number(redeemPoints) });
      await refreshUser();
      setRedeemPoints('');
    } catch (err) {
      setRedeemError(err.response?.data?.error || 'Redemption failed');
    }
  }

  function copyReferral() {
    navigator.clipboard.writeText(user?.referral_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="font-display text-3xl text-paper mb-2">College Wallet</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-paper/50 mb-1">Balance</p>
          <p className="font-mono text-3xl text-signal">₹{Number(user?.wallet_balance || 0).toFixed(0)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-paper/50 mb-1">Reward points</p>
          <p className="font-mono text-3xl text-signal">{user?.reward_points || 0}</p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-display text-lg text-paper mb-2">Add money</h3>
        <p className="text-[11px] text-paper/40 mb-3">
          Demo top-up — credits instantly. A real deployment would charge a payment
          gateway first and only credit on success.
        </p>
        <form onSubmit={topUp} className="flex gap-2">
          <input
            type="number" min="1" max="5000" required
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (₹)"
            className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
          />
          <button type="submit" disabled={loading} className="btn-primary text-sm px-4">
            {loading ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-chili text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          {[50, 100, 200].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))} className="btn-ghost text-xs px-3 py-1">₹{v}</button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-display text-lg text-paper mb-2">Redeem points</h3>
        <p className="text-[11px] text-paper/40 mb-3">10 points = ₹1 wallet credit.</p>
        <form onSubmit={redeem} className="flex gap-2">
          <input
            type="number" min="1" required
            value={redeemPoints} onChange={(e) => setRedeemPoints(e.target.value)}
            placeholder="Points to redeem"
            className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
          />
          <button type="submit" className="btn-primary text-sm px-4">Redeem</button>
        </form>
        {redeemError && <p className="text-chili text-xs mt-2">{redeemError}</p>}
      </div>

      <div className="card p-4">
        <h3 className="font-display text-lg text-paper mb-2">Your referral code</h3>
        <p className="text-[11px] text-paper/40 mb-3">
          Share this — when a friend registers with it, you both get 50 bonus points.
        </p>
        <div className="flex gap-2">
          <span className="flap-digit px-3 py-2 flex-1 text-center">{user?.referral_code}</span>
          <button onClick={copyReferral} className="btn-ghost text-xs px-3">{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>
    </div>
  );
}
