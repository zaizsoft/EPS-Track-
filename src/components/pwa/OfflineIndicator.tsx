import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-400/40"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>وضع أوفلاين — يتم الحفظ محلياً والمزامنة تلقائياً عند الاتصال</span>
    </div>
  );
};
