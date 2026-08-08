import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});

  async function load() {
    const { data } = await api.get('/feedback/all');
    setFeedback(data);
  }
  useEffect(() => { load(); }, []);

  async function sendReply(f) {
    const admin_reply = replyDrafts[f.id];
    if (!admin_reply?.trim()) return;
    await api.patch(`/feedback/${f.id}/reply`, { admin_reply: admin_reply.trim() });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-paper mb-4">Reviews</h1>
      <div className="space-y-3">
        {feedback.map((f) => (
          <div key={f.id} className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-signal font-mono text-sm">Food {f.food_rating}★ · Service {f.service_rating}★</span>
              <span className="text-xs text-paper/40">{f.Order?.token_number}</span>
            </div>
            {f.comment && <p className="text-sm text-paper/70 mb-2">"{f.comment}"</p>}
            {f.admin_reply ? (
              <p className="text-xs text-leaf bg-panel2 rounded-lg p-2">Reply: {f.admin_reply}</p>
            ) : (
              <div className="flex gap-2 mt-2">
                <input
                  value={replyDrafts[f.id] || ''}
                  onChange={(e) => setReplyDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                  placeholder="Write a reply…"
                  className="flex-1 bg-panel2 border border-white/10 rounded-lg px-3 py-1.5 text-paper text-xs outline-none focus:border-signal"
                />
                <button onClick={() => sendReply(f)} className="btn-ghost text-xs px-3">Reply</button>
              </div>
            )}
          </div>
        ))}
        {feedback.length === 0 && <p className="text-paper/40 text-sm">No reviews yet.</p>}
      </div>
    </div>
  );
}
