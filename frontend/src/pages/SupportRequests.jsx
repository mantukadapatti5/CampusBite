import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function SupportRequests() {
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [mine, setMine] = useState([]);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    const { data } = await api.get('/support/mine');
    setMine(data);
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!message.trim()) return setError('Please write a message');
    try {
      await api.post('/support', { type, message: message.trim() });
      setMessage('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2500);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit');
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-3xl text-paper mb-4">Suggestions & Issues</h1>

      <form onSubmit={submit} className="card p-4 space-y-3 mb-6">
        <div className="flex gap-2">
          <button type="button" onClick={() => setType('suggestion')}
            className={`flex-1 text-xs py-2 rounded-lg border ${type === 'suggestion' ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}>
            Suggest new food
          </button>
          <button type="button" onClick={() => setType('issue')}
            className={`flex-1 text-xs py-2 rounded-lg border ${type === 'issue' ? 'border-signal text-signal' : 'border-white/10 text-paper/60'}`}>
            Report an issue
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder={type === 'suggestion' ? "What food would you like to see added?" : "What went wrong?"}
          className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
        />
        {error && <p className="text-chili text-xs">{error}</p>}
        {submitted && <p className="text-leaf text-xs">Thanks — sent to the canteen team.</p>}
        <button type="submit" className="btn-primary text-sm w-full">Submit</button>
      </form>

      <h3 className="font-display text-lg text-paper mb-2">Your past submissions</h3>
      <div className="space-y-2">
        {mine.map((r) => (
          <div key={r.id} className="card p-3">
            <p className="text-sm text-paper">
              <span className={`text-xs font-mono uppercase ${r.type === 'issue' ? 'text-chili' : 'text-signal'}`}>{r.type}</span>
              {' — '}{r.message}
            </p>
            <p className="text-[11px] text-paper/40 mt-1">
              {r.status === 'resolved' ? 'Resolved' : 'Open'} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {mine.length === 0 && <p className="text-paper/40 text-sm">Nothing submitted yet.</p>}
      </div>
    </div>
  );
}
