import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function CrowdPrediction() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/crowd-prediction').then(({ data }) => setData(data));
  }, []);

  if (!data) return null;

  return (
    <div className="card p-4">
      <h3 className="font-display text-xl text-paper tracking-wide mb-1">CROWD FORECAST</h3>
      <p className="text-xs text-paper/50 mb-3">
        Based on past orders on this weekday — a historical average, not a live count.
      </p>

      {!data.has_history || data.hours.length === 0 ? (
        <p className="text-xs text-paper/40">Not enough order history yet to predict crowd levels.</p>
      ) : (
        <div className="space-y-1.5">
          {data.hours.map((h) => (
            <div key={h.hour} className="flex items-center justify-between text-xs">
              <span className="font-mono text-paper/60">{String(h.hour).padStart(2, '0')}:00</span>
              <span
                className={
                  h.level === 'high' ? 'text-chili' : h.level === 'medium' ? 'text-signal' : 'text-leaf'
                }
              >
                {h.level.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
