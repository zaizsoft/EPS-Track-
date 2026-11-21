import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useApp } from '../../context/AppContext';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? 'px-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors'
            : 'px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-950/20 transition-all active:scale-95'
        }
        title="تثبيت التطبيق على جهازك للعمل السريع والأوفلاين"
      >
        <Download className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        <span>{compact ? 'تثبيت' : 'تثبيت التطبيق'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? `px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-slate-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`
              : `px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-slate-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`
          }
          title="طريقة تثبيت التطبيق على iPhone / iPad"
        >
          <Download className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          <span>{compact ? 'تثبيت' : 'تثبيت على iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-base font-black">تثبيت التطبيق على iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className={`space-y-3 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex items-center gap-2.5">
                  <Share className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <PlusSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    2. مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors"
              >
                حسناً
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
