import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { observationTypesConfig } from '../../data/mockData';
import { ObservationType } from '../../types';
import { 
  UserX, 
  Clock, 
  Shirt, 
  PlusCircle, 
  MinusCircle, 
  FileCheck2, 
  X, 
  CheckCircle2, 
  Sparkles,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export const QuickActionModal: React.FC = () => {
  const { selectedStudentForAction, setSelectedStudentForAction, addObservation, activeSessionTopic, theme } = useApp();
  const [customNote, setCustomNote] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [justSubmittedType, setJustSubmittedType] = useState<ObservationType | null>(null);

  const isDark = theme === 'dark';

  if (!selectedStudentForAction) return null;

  const handleAction = (type: ObservationType) => {
    setJustSubmittedType(type);
    addObservation(selectedStudentForAction.id, type, customNote.trim() || undefined);
    
    // Quick close with small delay for visual feedback
    setTimeout(() => {
      setJustSubmittedType(null);
      setCustomNote('');
      setShowNoteField(false);
      setSelectedStudentForAction(null);
    }, 280);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'UserX': return <UserX className="w-6 h-6" />;
      case 'Clock': return <Clock className="w-6 h-6" />;
      case 'Shirt': return <Shirt className="w-6 h-6" />;
      case 'PlusCircle': return <PlusCircle className="w-6 h-6" />;
      case 'MinusCircle': return <MinusCircle className="w-6 h-6" />;
      case 'FileCheck2': return <FileCheck2 className="w-6 h-6" />;
      default: return <AlertCircle className="w-6 h-6" />;
    }
  };

  return (
    <div 
      id="quick-action-overlay" 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setSelectedStudentForAction(null)}
    >
      <div 
        id="quick-action-sheet"
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto transition-colors ${
          isDark 
            ? 'bg-slate-900 border-t sm:border border-slate-700/80 text-white' 
            : 'bg-white border-t sm:border border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Student Info */}
        <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {selectedStudentForAction.studentNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedStudentForAction.firstName} {selectedStudentForAction.lastName}
                </h3>
                {selectedStudentForAction.gender === 'F' ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    isDark ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-pink-100 text-pink-700 border-pink-200'
                  }`}>
                    أنثى
                  </span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    ذكر
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                حصة: <span className="text-emerald-600 font-medium">{activeSessionTopic}</span>
              </p>
            </div>
          </div>

          <button
            id="close-quick-modal-btn"
            onClick={() => setSelectedStudentForAction(null)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Rapid Action Buttons (Requested in Prompt) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              تسجيل سريع بنقرة واحدة (One-Tap Action)
            </span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> حفظ سحابي فوري
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* 1. غياب (Absent) */}
            <button
              id="action-btn-absent"
              onClick={() => handleAction('absent')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'absent'
                  ? 'bg-red-500 ring-4 ring-red-400/40 text-white'
                  : isDark
                  ? 'bg-red-950/40 hover:bg-red-900/60 border-red-500/40 text-red-100 hover:border-red-400'
                  : 'bg-red-50 hover:bg-red-100/80 border-red-200 text-red-900 hover:border-red-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              }`}>
                {getIcon(observationTypesConfig.absent.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-red-200' : 'text-red-950'}`}>غياب</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-red-400/90' : 'text-red-700'}`}>Absent (غير حاضر)</div>
              </div>
            </button>

            {/* 2. تأخر (Retard) */}
            <button
              id="action-btn-late"
              onClick={() => handleAction('late')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'late'
                  ? 'bg-amber-500 ring-4 ring-amber-400/40 text-white'
                  : isDark
                  ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-100 hover:border-amber-400'
                  : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900 hover:border-amber-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
              }`}>
                {getIcon(observationTypesConfig.late.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>تأخر</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>Retard (تأخير)</div>
              </div>
            </button>

            {/* 3. بدون بدلة رياضية (Sans Tenue) */}
            <button
              id="action-btn-no-uniform"
              onClick={() => handleAction('no_uniform')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'no_uniform'
                  ? 'bg-violet-500 ring-4 ring-violet-400/40 text-white'
                  : isDark
                  ? 'bg-violet-950/40 hover:bg-violet-900/60 border-violet-500/40 text-violet-100 hover:border-violet-400'
                  : 'bg-violet-50 hover:bg-violet-100/80 border-violet-200 text-violet-900 hover:border-violet-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
              }`}>
                {getIcon(observationTypesConfig.no_uniform.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-violet-200' : 'text-violet-950'}`}>بدون بدلة</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-violet-400/90' : 'text-violet-700'}`}>Sans Tenue (لباس)</div>
              </div>
            </button>

            {/* 4. علامة زائد (+) مشاركة إيجابية */}
            <button
              id="action-btn-positive"
              onClick={() => handleAction('positive')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'positive'
                  ? 'bg-emerald-500 ring-4 ring-emerald-400/40 text-white'
                  : isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-100 hover:border-emerald-400'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900 hover:border-emerald-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {getIcon(observationTypesConfig.positive.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-emerald-200' : 'text-emerald-950'}`}>مشاركة (+)</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-emerald-400/90' : 'text-emerald-700'}`}>Bonus / نشاط متميز</div>
              </div>
            </button>

            {/* 5. علامة ناقص (-) انضباط أو سلوك سلبي */}
            <button
              id="action-btn-negative"
              onClick={() => handleAction('negative')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'negative'
                  ? 'bg-rose-500 ring-4 ring-rose-400/40 text-white'
                  : isDark
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/40 text-rose-100 hover:border-rose-400'
                  : 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-900 hover:border-rose-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
              }`}>
                {getIcon(observationTypesConfig.negative.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-rose-200' : 'text-rose-950'}`}>سلوك سلبي (-)</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-rose-400/90' : 'text-rose-700'}`}>Malus / تشويش</div>
              </div>
            </button>

            {/* 6. إعفاء طبي (Dispensé) */}
            <button
              id="action-btn-dispensed"
              onClick={() => handleAction('dispensed')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-150 active:scale-95 text-right ${
                justSubmittedType === 'dispensed'
                  ? 'bg-sky-500 ring-4 ring-sky-400/40 text-white'
                  : isDark
                  ? 'bg-sky-950/40 hover:bg-sky-900/60 border-sky-500/40 text-sky-100 hover:border-sky-400'
                  : 'bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-900 hover:border-sky-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-600'
              }`}>
                {getIcon(observationTypesConfig.dispensed.iconName)}
              </div>
              <div>
                <div className={`font-bold text-base ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>إعفاء طبي</div>
                <div className={`text-[11px] font-medium ${isDark ? 'text-sky-400/90' : 'text-sky-700'}`}>Dispensé (شهادة)</div>
              </div>
            </button>
          </div>
        </div>

        {/* Optional Custom Note Section */}
        <div className="pt-2">
          {!showNoteField ? (
            <button
              id="toggle-custom-note-btn"
              type="button"
              onClick={() => setShowNoteField(true)}
              className={`text-xs flex items-center gap-1.5 transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              إضافة ملاحظة كتابية مخصصة (اختياري)...
            </button>
          ) : (
            <div className="space-y-1.5">
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                ملاحظة تفصيلية:
              </label>
              <input
                id="custom-note-input"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="مثال: نسي الحذاء الرياضي، أبدع في رمي الكرة..."
                className={`w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:border-emerald-500 ${
                  isDark 
                    ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Realtime payload preview */}
        <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
          isDark ? 'bg-slate-800/60 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span>التاريخ والوقت المسجل:</span>
          <span className="font-mono text-emerald-600 font-semibold dir-ltr">
            {new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
