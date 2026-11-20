import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { observationTypesConfig } from '../../data/mockData';
import { getLocalDateStr } from '../../utils/date';
import { Printer, X, FileText, CheckCircle2, ListFilter, Sliders } from 'lucide-react';

interface OfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClassId: string;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  isOpen,
  onClose,
  selectedClassId
}) => {
  const { classes, students, observations, teacherProfile, activeSessionTopic, theme } = useApp();
  const isDark = theme === 'dark';

  const [currentClassId, setCurrentClassId] = useState(selectedClassId);
  const [printDocumentType, setPrintDocumentType] = useState<'roster' | 'session'>('roster');

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === currentClassId) || classes[0];
  const classStudents = students
    .filter((s) => s.classId === currentClass.id)
    .sort((a, b) => a.studentNumber - b.studentNumber);

  const todayStr = getLocalDateStr();
  const todayObservations = observations.filter(
    (o) => o.classId === currentClass.id && o.date === todayStr
  );

  // Map student observations
  const studentObsMap = new Map<string, typeof todayObservations>();
  for (const obs of todayObservations) {
    const list = studentObsMap.get(obs.studentId) || [];
    list.push(obs);
    studentObsMap.set(obs.studentId, list);
  }

  // Stats calculation
  const totalCount = classStudents.length;
  const absentCount = classStudents.filter((s) =>
    (studentObsMap.get(s.id) || []).some((o) => o.type === 'absent')
  ).length;
  const noUniformCount = classStudents.filter((s) =>
    (studentObsMap.get(s.id) || []).some((o) => o.type === 'no_uniform')
  ).length;
  const lateCount = classStudents.filter((s) =>
    (studentObsMap.get(s.id) || []).some((o) => o.type === 'late')
  ).length;
  const presentCount = totalCount - absentCount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto ${
      isDark ? 'bg-slate-950/85' : 'bg-slate-900/40'
    }`}>
      {/* Container */}
      <div className={`w-full max-w-4xl border rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Top Control Bar (Hidden when printing) */}
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 print:hidden ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                طباعة الوثائق الرسمية • ابتدائية الشهيد بني العربي
              </h3>
              <p className="text-[11px] text-slate-400">
                أستاذ المادة: {teacherProfile.name} • ولاية الوادي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Document Type Switcher */}
            <div className={`border rounded-xl p-0.5 flex items-center text-xs font-bold ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
            }`}>
              <button
                onClick={() => setPrintDocumentType('roster')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printDocumentType === 'roster'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                القائمة الاسمية الرسمية
              </button>
              <button
                onClick={() => setPrintDocumentType('session')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printDocumentType === 'session'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كشف المتابعة والملاحظات
              </button>
            </div>

            {/* Class Selector Dropdown */}
            <select
              value={currentClassId}
              onChange={(e) => setCurrentClassId(e.target.value)}
              className={`border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} تلميذ)
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كـ PDF</span>
            </button>

            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 print:bg-white print:p-0 ${
          isDark ? 'bg-slate-950/60' : 'bg-slate-100/70'
        }`}>
          {/* ============================================================== */}
          {/* TEMPLATE 1: Exact Official Algerian Roster (Matching User PDF)  */}
          {/* ============================================================== */}
          {printDocumentType === 'roster' && (
            <div 
              id="official-pe-printable-sheet" 
              className="w-full bg-white text-slate-900 p-8 rounded-xl shadow-lg print:shadow-none print:p-2 print:border-none print:w-full font-serif border border-slate-300 max-w-3xl mx-auto"
              style={{ fontFamily: "'Cairo', 'Amiri', serif, sans-serif" }}
            >
              {/* Republic & Ministry Header */}
              <div className="text-center space-y-1 mb-4">
                <h2 className="text-base font-black tracking-wide text-slate-950">
                  الجمهورية الجزائرية الديمقراطية الشعبية
                </h2>
                <h3 className="text-sm font-bold text-slate-800">
                  وزارة التربية الوطنية
                </h3>
                <h4 className="text-xs font-medium text-slate-700">
                  مديرية التربية لولاية الوادي
                </h4>
              </div>

              {/* School & Year Meta */}
              <div className="flex justify-between items-center text-xs font-bold border-t border-slate-400 pt-2 mb-3 text-slate-800">
                <div className="space-y-1 text-right">
                  <p>المؤسسة: ابتدائية الشهيد بني العربي</p>
                  <p>الأستاذ: {teacherProfile.name.replace('الأستاذ: ', '')}</p>
                </div>
                <div className="space-y-1 text-left">
                  <p>السنة الدراسية: {teacherProfile.academicYear}</p>
                  <p>القسم: {currentClass.grade} {currentClass.name.includes('(أ)') ? 'أ' : 'ب'}</p>
                </div>
              </div>

              {/* Title Badge Banner (Matching the PDF header style) */}
              <div className="text-center my-3">
                <div className="inline-block bg-slate-900 text-white font-black text-sm px-8 py-2 rounded-xl shadow-sm tracking-wide">
                  القائمة الاسمية للتلاميذ
                </div>
              </div>

              {/* Students Table */}
              <table className="w-full text-xs border-collapse border border-slate-700 mt-2">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-center">
                    <th className="border border-slate-700 p-2 w-16">رقم</th>
                    <th className="border border-slate-700 p-2 text-right pr-4">الاسم واللقب</th>
                    <th className="border border-slate-700 p-2 w-44">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => {
                    const formattedNum = student.studentNumber < 10 
                      ? `0${student.studentNumber}` 
                      : `${student.studentNumber}`;
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-slate-300 text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <td className="border border-slate-300 p-2 text-center font-bold font-mono text-slate-800">
                          {formattedNum}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold pr-4 text-right">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="border border-slate-300 p-2 text-center text-slate-600 text-[11px]">
                          {student.medicalStatus || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Teacher Signature Footer (Exact match to PDF) */}
              <div className="text-center mt-6 pt-4 text-xs font-black text-slate-900">
                <p>إمضاء الأستاذ</p>
                <div className="h-10"></div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TEMPLATE 2: Detailed PE Daily Observation & Tracking Sheet     */}
          {/* ============================================================== */}
          {printDocumentType === 'session' && (
            <div 
              id="official-pe-printable-sheet" 
              className="w-full bg-white text-slate-900 p-8 rounded-xl shadow-lg print:shadow-none print:p-2 print:border-none print:w-full font-serif border border-slate-300"
              style={{ fontFamily: "'Cairo', serif, sans-serif" }}
            >
              {/* Ministry / School Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex justify-between items-start text-xs font-bold leading-relaxed text-slate-800">
                  <div className="text-right">
                    <p>الجمهورية الجزائرية الديمقراطية الشعبية</p>
                    <p>وزارة التربية الوطنية</p>
                    <p>مديرية التربية لولاية الوادي</p>
                    <p className="mt-1 text-emerald-800 font-bold">{teacherProfile.schoolName}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-1 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-900 text-xs">
                      EPS
                    </div>
                    <p className="font-mono text-[11px]">السنة الدراسية: {teacherProfile.academicYear}</p>
                  </div>
                  <div className="text-left dir-ltr font-mono text-[11px]">
                    <p>RÉPUBLIQUE ALGÉRIENNE</p>
                    <p>MINISTÈRE DE L'ÉDUCATION</p>
                    <p>Éducation Physique & Sportive</p>
                    <p className="mt-1 text-slate-600">Date: {todayStr}</p>
                  </div>
                </div>

                {/* Title Header */}
                <div className="text-center mt-4">
                  <h1 className="text-lg font-black tracking-wide text-slate-950 uppercase border-y-2 border-slate-900 py-1.5 inline-block px-8">
                    كشف الحضور والملاحظات اليومي لمادة التربية البدنية والرياضية
                  </h1>
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-4 gap-3 text-xs mt-3 bg-slate-100 p-2.5 rounded border border-slate-300 font-medium">
                  <div>
                    <span className="text-slate-500 block text-[10px]">الأستاذ المشرف:</span>
                    <span className="font-bold text-slate-900">{teacherProfile.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">القسم / الفوج:</span>
                    <span className="font-bold text-emerald-800">{currentClass.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">موضوع الحصة:</span>
                    <span className="font-bold text-slate-900">{activeSessionTopic}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">التوقيت:</span>
                    <span className="font-bold text-slate-900">{currentClass.scheduleDay || 'اليوم'} ({currentClass.scheduleTime || 'صباحاً'})</span>
                  </div>
                </div>
              </div>

              {/* Students Table */}
              <table className="w-full text-xs border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400 text-center">
                    <th className="border border-slate-400 p-1.5 w-10">الرقم</th>
                    <th className="border border-slate-400 p-1.5 text-right pr-3">الاسم واللقب</th>
                    <th className="border border-slate-400 p-1.5 w-16">الحالة</th>
                    <th className="border border-slate-400 p-1.5 w-20">البدلة الرياضية</th>
                    <th className="border border-slate-400 p-1.5 w-20">المشاركة (+)</th>
                    <th className="border border-slate-400 p-1.5 w-20">الانضباط (-)</th>
                    <th className="border border-slate-400 p-1.5 text-right pr-2">الملاحظات والتوجيهات الميدانية</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => {
                    const obsList = studentObsMap.get(student.id) || [];
                    const isAbsent = obsList.some((o) => o.type === 'absent');
                    const isLate = obsList.some((o) => o.type === 'late');
                    const isNoUniform = obsList.some((o) => o.type === 'no_uniform');
                    const isPositive = obsList.some((o) => o.type === 'positive');
                    const isNegative = obsList.some((o) => o.type === 'negative');
                    const isDispensed = obsList.some((o) => o.type === 'dispensed') || student.medicalStatus;
                    
                    const noteTexts = obsList
                      .map((o) => o.noteText)
                      .filter(Boolean)
                      .join(' - ');

                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-slate-300 text-slate-800 ${
                          isAbsent ? 'bg-red-50 text-red-900 font-bold' : isNoUniform ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                          {student.studentNumber}
                        </td>
                        <td className="border border-slate-300 p-1.5 font-bold pr-2">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          {isAbsent ? (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-[10px] font-bold">
                              غائب (A)
                            </span>
                          ) : isLate ? (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold">
                              تأخر (R)
                            </span>
                          ) : isDispensed ? (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-[10px] font-bold">
                              معفى طبياً
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">حاضر (P)</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          {isNoUniform ? (
                            <span className="text-red-700 font-bold text-[11px]">بدون بدلة ✗</span>
                          ) : isAbsent ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span className="text-emerald-700 text-[11px]">مكتملة ✓</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                          {isPositive ? <span className="text-emerald-700 text-sm font-black">+1</span> : '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">
                          {isNegative ? <span className="text-rose-700 text-sm font-black">-1</span> : '-'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-[11px] text-slate-700 pr-2">
                          {noteTexts || (student.medicalStatus ? `شهادة طبية: ${student.medicalStatus}` : '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Official Summary Statistics */}
              <div className="grid grid-cols-4 gap-4 mt-4 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
                <div className="text-center border-l border-slate-300">
                  <span className="text-slate-500 block text-[10px]">تعداد القسم:</span>
                  <span className="font-black text-slate-900 text-sm">{totalCount} تلميذ</span>
                </div>
                <div className="text-center border-l border-slate-300">
                  <span className="text-slate-500 block text-[10px]">عدد الحاضرين:</span>
                  <span className="font-black text-emerald-700 text-sm">{presentCount} تلميذ</span>
                </div>
                <div className="text-center border-l border-slate-300">
                  <span className="text-slate-500 block text-[10px]">عدد الغيابات:</span>
                  <span className="font-black text-red-600 text-sm">{absentCount} تلميذ</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 block text-[10px]">مخالفة البدلة الرياضية:</span>
                  <span className="font-black text-amber-700 text-sm">{noUniformCount} حالة</span>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-300 text-xs text-slate-800">
                <div className="text-right">
                  <p className="font-bold">ملاحظات المستشار الرئيسي للتربية / الإدارة:</p>
                  <div className="h-14 w-48 border-b border-dashed border-slate-400 mt-2"></div>
                  <p className="text-[10px] text-slate-500 mt-1">ختم وتأشيرة الإدارة</p>
                </div>

                <div className="text-left">
                  <p className="font-bold">توقيع أستاذ المادة:</p>
                  <p className="text-[11px] text-slate-600 mt-1">{teacherProfile.name}</p>
                  <div className="h-12 w-40 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
