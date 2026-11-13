import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, FileText, Check, AlertCircle, X, HelpCircle } from 'lucide-react';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClassId: string;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  targetClassId
}) => {
  const { classes, importStudentsList, theme } = useApp();
  const isDark = theme === 'dark';
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<Array<{ studentNumber: number; firstName: string; lastName: string; gender: 'M' | 'F' }>>([]);

  const currentClass = classes.find((c) => c.id === targetClassId) || classes[0];

  if (!isOpen) return null;

  const handleParse = (text: string) => {
    setErrorMsg(null);
    const lines = text.trim().split('\n');
    const parsed: Array<{ studentNumber: number; firstName: string; lastName: string; gender: 'M' | 'F' }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // support comma, tab, or semicolon separated
      const parts = line.split(/[,\t;]+/).map((s) => s.trim()).filter(Boolean);

      if (parts.length >= 2) {
        // pattern: [number, firstName, lastName, gender?] or [firstName, lastName, gender?]
        let num = i + 1;
        let firstName = '';
        let lastName = '';
        let gender: 'M' | 'F' = 'M';

        if (!isNaN(Number(parts[0]))) {
          num = Number(parts[0]);
          firstName = parts[1] || '';
          lastName = parts[2] || '';
          if (parts[3] && (parts[3].toUpperCase() === 'F' || parts[3].includes('أنثى') || parts[3].toUpperCase() === 'FEMALE')) {
            gender = 'F';
          }
        } else {
          firstName = parts[0] || '';
          lastName = parts[1] || '';
          if (parts[2] && (parts[2].toUpperCase() === 'F' || parts[2].includes('أنثى') || parts[2].toUpperCase() === 'FEMALE')) {
            gender = 'F';
          }
        }

        if (firstName && lastName) {
          parsed.push({ studentNumber: num, firstName, lastName, gender });
        }
      } else {
        // Space separated line: "أحمد بوزيان"
        const spaceParts = line.split(/\s+/);
        if (spaceParts.length >= 2) {
          parsed.push({
            studentNumber: i + 1,
            firstName: spaceParts[0],
            lastName: spaceParts.slice(1).join(' '),
            gender: 'M'
          });
        }
      }
    }

    if (parsed.length === 0) {
      setErrorMsg('لم يتم التعرف على أسماء صالحة. يرجى التأكد من التنسيق (الاسم واللقب في كل سطر).');
      setPreviewList([]);
      return;
    }

    setPreviewList(parsed);
  };

  const handleApplyImport = () => {
    if (previewList.length === 0) return;
    importStudentsList(targetClassId, previewList);
    onClose();
  };

  const loadSampleData = () => {
    const sample = `1, يوسف, بن علي, M
2, فاطمة, بلحاج, F
3, سفيان, مرزوقي, M
4, إيمان, عثماني, F
5, زكرياء, قندوز, M
6, مروة, بوعبدلي, F
7, أيمن, سلطاني, M
8, رانيا, شريف, F
9, رياض, قاسمي, M
10, خولة, داودي, F`;
    setInputText(sample);
    handleParse(sample);
  };

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 ${
      isDark ? 'bg-slate-950/80' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>استيراد ورفع قائمة التلاميذ (Excel / CSV)</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                القسم المختار: <span className="text-emerald-600 font-semibold">{currentClass?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
          isDark ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-emerald-50/50 border-emerald-200 text-slate-700'
        }`}>
          <div className="font-bold text-emerald-600 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>طريقة الإدخال السريعة:</span>
          </div>
          <p>
            يمكنك نسخ ولصق أعمدة جدول Excel مباشرة هنا، أو كتابة تلميذ في كل سطر بالتنسيق التالي:
          </p>
          <code className={`block px-2.5 py-1.5 rounded font-mono text-[11px] dir-ltr text-right border ${
            isDark ? 'bg-slate-950 text-emerald-300 border-slate-800' : 'bg-white text-emerald-800 border-emerald-200'
          }`}>
            الرقم, الاسم, اللقب, الجنس (M أو F)
          </code>
        </div>

        {/* Text Area */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>الصق محتوى الملف أو النص هنا:</label>
            <button
              type="button"
              onClick={loadSampleData}
              className="text-xs text-emerald-600 hover:text-emerald-700 underline font-medium"
            >
              تجربة نموذج بيانات جاهز (10 تلاميذ)
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleParse(e.target.value);
            }}
            rows={6}
            placeholder="مثال:&#10;1, أحمد, بوزيان, M&#10;2, ياسمين, بلحاج, F&#10;3, محمد, قادري, M"
            className={`w-full p-3 border rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview parsed table */}
        {previewList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                معاينة الأسماء المستخرجة ({previewList.length} تلميذ):
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">جاهز للحفظ والربط بالموبايل</span>
            </div>

            <div className={`max-h-48 overflow-y-auto border rounded-xl divide-y ${
              isDark ? 'border-slate-800 bg-slate-950/60 divide-slate-800/80' : 'border-slate-200 bg-slate-50 divide-slate-200'
            }`}>
              {previewList.map((item, idx) => (
                <div key={idx} className={`px-3 py-1.5 text-xs flex items-center justify-between ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md text-center text-[11px] flex items-center justify-center font-mono ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.studentNumber}
                    </span>
                    <span className="font-semibold">{item.firstName} {item.lastName}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    item.gender === 'F' 
                      ? isDark ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700' 
                      : isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.gender === 'F' ? 'أنثى' : 'ذكر'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={previewList.length === 0}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-colors"
          >
            <Check className="w-4 h-4" />
            تأكيد ورفع القائمة إلى السحابة
          </button>
        </div>
      </div>
    </div>
  );
};
