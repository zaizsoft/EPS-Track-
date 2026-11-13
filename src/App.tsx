import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileFieldView } from './components/mobile/MobileFieldView';
import { DesktopDashboard } from './components/desktop/DesktopDashboard';

function detectIsMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) &&
    !/iPad/i.test(ua);
  const isNarrowScreen = window.matchMedia('(max-width: 767px)').matches;
  return isMobileUA || isNarrowScreen;
}

const AppContent: React.FC = () => {
  const { theme } = useApp();
  const [isMobile, setIsMobile] = useState<boolean>(() => detectIsMobileBrowser());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleUpdate = () => {
      setIsMobile(detectIsMobileBrowser());
    };

    handleUpdate();
    window.addEventListener('resize', handleUpdate);
    mediaQuery.addEventListener('change', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      mediaQuery.removeEventListener('change', handleUpdate);
    };
  }, []);

  const isDark = theme === 'dark';

  // Mobile browser: directly render the native mobile field view full-screen (no top bar, no phone frame)
  if (isMobile) {
    return (
      <div
        className={`min-h-screen w-full transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <MobileFieldView />
      </div>
    );
  }

  // Desktop / PC browser: directly render the central web dashboard
  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <main className="flex-1 flex flex-col justify-start">
        <DesktopDashboard />
      </main>

      <footer
        className={`py-3 px-4 border-t text-center text-xs flex flex-wrap items-center justify-center gap-4 transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800/80 text-slate-500'
            : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <span>نظام متابعة التربية البدنية والرياضية (EPS Track)</span>
        <span>•</span>
        <span className="text-emerald-500 font-medium">
          مزامنة سحابية مجانية عبر Google Firebase
        </span>
        <span>•</span>
        <span>ابتدائية الشهيد بني العربي - ولاية الوادي</span>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
