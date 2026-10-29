import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api.get('/announcements/active').then(({ data }) => setAnnouncements(data));
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {announcements.map((a) => (
        <div key={a.id} className="card p-3 border-signal/30 text-sm text-paper/80">
          📢 {a.message}
        </div>
      ))}
    </div>
  );
}
