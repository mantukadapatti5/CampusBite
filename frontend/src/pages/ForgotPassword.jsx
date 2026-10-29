import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [usn, setUsn] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function verifyIdentity(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { usn_or_id: usn.trim(), phone });
      setResetToken(data.reset_token);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify identity');
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { reset_token: resetToken, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    }
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto mt-10 card p-6 text-center">
        <h1 className="font-display text-2xl text-leaf mb-2">Password updated</h1>
        <p className="text-sm text-paper/60">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-10 card p-6">
      <h1 className="font-display text-3xl text-paper mb-1">Forgot password</h1>
      <p className="text-sm text-paper/60 mb-6">
        {step === 1
          ? 'Verify your USN and registered phone number.'
          : 'Set a new password.'}
      </p>

      {step === 1 ? (
        <form onSubmit={verifyIdentity} className="space-y-4">
          <div>
            <label className="block text-xs text-paper/60 mb-1">USN / Staff ID</label>
            <input required value={usn} onChange={(e) => setUsn(e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal uppercase" />
          </div>
          <div>
            <label className="block text-xs text-paper/60 mb-1">Registered phone number</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal" />
          </div>
          {error && <p className="text-chili text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">Verify</button>
        </form>
      ) : (
        <form onSubmit={submitNewPassword} className="space-y-4">
          <div>
            <label className="block text-xs text-paper/60 mb-1">New password (min 6 characters)</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper outline-none focus:border-signal" />
          </div>
          {error && <p className="text-chili text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">Set new password</button>
        </form>
      )}

      <p className="text-xs text-paper/50 mt-4">
        <Link to="/login" className="text-signal">Back to login</Link>
      </p>
    </div>
  );
}
