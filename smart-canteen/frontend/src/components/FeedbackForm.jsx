import React, { useState } from 'react';
import api from '../api/client';

function StarPicker({ label, value, onChange }) {
  return (
    <div>
      <p className="text-xs text-paper/60 mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-2xl leading-none ${n <= value ? 'text-signal' : 'text-panel2'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackForm({ orderId, existingFeedback }) {
  const [foodRating, setFoodRating] = useState(existingFeedback?.food_rating || 0);
  const [serviceRating, setServiceRating] = useState(existingFeedback?.service_rating || 0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [submitted, setSubmitted] = useState(!!existingFeedback);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!foodRating || !serviceRating) {
      setError('Please rate both food and service');
      return;
    }
    try {
      await api.post('/feedback', { order_id: orderId, food_rating: foodRating, service_rating: serviceRating, comment });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit feedback');
    }
  }

  if (submitted) {
    return (
      <div className="card p-4 mt-4">
        <h3 className="font-display text-lg text-paper mb-1">Thanks for the feedback!</h3>
        <p className="text-xs text-paper/50">Food {foodRating}★ · Service {serviceRating}★</p>
      </div>
    );
  }

  return (
    <div className="card p-4 mt-4">
      <h3 className="font-display text-lg text-paper mb-3">Rate your order</h3>
      <div className="space-y-3">
        <StarPicker label="Food quality" value={foodRating} onChange={setFoodRating} />
        <StarPicker label="Service" value={serviceRating} onChange={setServiceRating} />
        <div>
          <p className="text-xs text-paper/60 mb-1">Suggestions (optional)</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full bg-panel2 border border-white/10 rounded-lg px-3 py-2 text-paper text-sm outline-none focus:border-signal"
          />
        </div>
        {error && <p className="text-chili text-xs">{error}</p>}
        <button onClick={submit} className="btn-primary text-sm w-full">Submit feedback</button>
      </div>
    </div>
  );
}
