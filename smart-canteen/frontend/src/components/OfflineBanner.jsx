import React, { useEffect, useState } from 'react';
import { pendingCount, syncQueuedOrders } from '../utils/offlineQueue';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(pendingCount());
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (pendingCount() > 0) {
        setSyncMsg('Syncing queued orders…');
        syncQueuedOrders(({ success, error }) => {
          setPending(pendingCount());
          setSyncMsg(success ? 'Queued order synced.' : `Sync paused: ${error}`);
        }).then(() => setTimeout(() => setSyncMsg(''), 4000));
      }
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && pending === 0 && !syncMsg) return null;

  return (
    <div className={`text-center text-xs py-1.5 ${isOnline ? 'bg-leaf/20 text-leaf' : 'bg-chili/20 text-chili'}`}>
      {!isOnline && "You're offline — orders placed now will be queued and sent once you're back online."}
      {isOnline && pending > 0 && `${pending} queued order(s) waiting to sync.`}
      {isOnline && syncMsg && ` ${syncMsg}`}
    </div>
  );
}
