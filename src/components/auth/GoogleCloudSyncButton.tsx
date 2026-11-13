import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, LogOut, AlertCircle } from 'lucide-react';

interface GoogleCloudSyncButtonProps {
  compact?: boolean;
}

export const GoogleCloudSyncButton: React.FC<GoogleCloudSyncButtonProps> = ({ compact = false }) => {
  const {
    authUser,
    isAuthLoading,
    loginWithGoogle,
    logoutFromGoogle,
    cloudState,
    cloudError,
    isSyncing,
    theme,
  } = useApp();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      if (raw.includes('auth/unauthorized-domain')) {
        setLocalError('أضف نطاق الموقع في Firebase Authentication > Authorized domains');
      } else if (raw.includes('auth/popup-blocked')) {
        setLocalError('المتصفح منع نافذة تسجيل الدخول، اسمح بالنوافذ المنبثقة');
      } else if (raw.includes('auth/popup-closed-by-user')) {
        setLocalError('تم إغلاق نافذة تسجيل الدخول قبل الإكمال');
      } else {
        setLocalError('تعذر تسجيل الدخول، أعد المحاولة');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
          isDark
            ? 'bg-slate-800/80 border-slate-700 text-slate-300'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
        {!compact && <span>جاري التحقق من Google...</span>}
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="relative inline-flex flex-col items-end">
        <button
          id="google-signin-btn"
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
          className={`gsi-material-button inline-flex items-center gap-2 rounded-xl border font-bold transition-all active:scale-95 shadow-sm disabled:opacity-60 ${
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
          } ${
            isDark
              ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
          title="تسجيل الدخول بحساب Google للمزامنة المجانية بين الهاتف والحاسوب"
        >
          <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              style={{ display: 'block', width: '100%', height: '100%' }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </span>
          <span>
            {isSigningIn
              ? 'جاري الدخول...'
              : compact
                ? 'دخول Google'
                : 'تسجيل الدخول بحساب Google (مزامنة سحابية)'}
          </span>
        </button>

        {(localError || cloudError) && (
          <span className="mt-1 text-[10px] text-rose-500 font-medium flex items-center gap-1 text-right max-w-[260px]">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{localError || 'تعذر الاتصال السحابي، أعد المحاولة'}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        id="google-cloud-status-pill"
        className={`inline-flex items-center gap-2 rounded-xl border font-bold transition-all ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          isSyncing
            ? 'sync-blinking-pulse ring-2 ring-emerald-400/70 bg-emerald-600/20 text-emerald-500 border-emerald-400/80'
            : cloudState === 'connected'
              ? isDark
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : cloudState === 'error'
                ? isDark
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}
        title={`Google Cloud Firestore • ${authUser.email || authUser.displayName || ''}`}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 shrink-0 ${
            isSyncing
              ? 'sync-icon-rotate text-emerald-400'
              : cloudState === 'connecting'
                ? 'animate-spin text-amber-400'
                : 'text-emerald-500'
          }`}
        />

        <span className="truncate max-w-[110px] sm:max-w-[170px]">
          {isSyncing
            ? 'جاري المزامنة...'
            : compact
              ? authUser.displayName?.split(' ')[0] || 'متصل Google'
              : `Google: ${authUser.displayName || authUser.email || 'متصل'}`}
        </span>

        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            cloudState === 'connected'
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]'
              : cloudState === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : cloudState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
          }`}
        />
      </div>

      <button
        type="button"
        onClick={logoutFromGoogle}
        className={`p-1.5 rounded-xl border transition-colors ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border-slate-700'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 border-slate-300'
        }`}
        title="تسجيل الخروج من حساب Google"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
