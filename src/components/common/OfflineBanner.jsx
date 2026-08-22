import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 to-red-600 text-white text-xs font-bold py-2.5 px-4 shadow-md flex items-center justify-between gap-3 animate-pulse sticky top-16 z-30">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 animate-bounce" />
        <span className="text-left">
          Offline Mode active (Rural Connectivity mode). Emergency details and First-Aid guidance are stored offline.
        </span>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-sos'))}
        className="px-3 py-1 bg-white text-red-700 font-extrabold text-[10px] uppercase rounded-full tracking-wider whitespace-nowrap shadow-sm hover:bg-slate-100 transition-colors"
      >
        🆘 View First Aid / SOS
      </button>
    </div>
  );
};
