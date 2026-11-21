import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { QuickActionModal } from './QuickActionModal';
import { GoogleCloudSyncButton } from '../auth/GoogleCloudSyncButton';
import { observationTypesConfig } from '../../data/mockData';
import { OFFICIAL_TIMETABLE, getSlotsForClass } from '../../data/scheduleData';
import { Student } from '../../types';
import { getLocalDateStr } from '../../utils/date';
import { 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Check, 
  Users, 
  Plus, 
  CalendarClock,
  Clock,
  ArrowLeft,
  X,
  Sun,
  Moon
} from 'lucide-react';

export const MobileFieldView: React.FC = () => {
  const {
    classes,
    activeClassId,
    setActiveClassId,
    activeClass,
    activeStudents,
    setSelectedStudentForAction,
    observations,
    isOnline,
    authUser,
    cloudState,
    lastAddedObservation,
    undoLastObservation,
    scheduleStatus,
    hasManualClassSelection,
    clearManualClassSelection,
    followLiveSchedule,
    theme,
    toggleTheme
  } = useApp();

  const isDark = theme === 'dark';

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isManualChooserOpen, setIsManualChooserOpen] = useState(false);

  const showNoSessionChooser = isManualChooserOpen || (!scheduleStatus.activeSlot && !hasManualClassSelection);
  const activeScheduledClass = scheduleStatus.activeSlot
    ? classes.find((c) => c.id === scheduleStatus.activeSlot?.classId)
    : undefined;

  const handleSelectClass = (classId: string) => {
    setActiveClassId(classId);
    setIsManualChooserOpen(false);
  };

  // Today's observations for the active class (using local calendar date)
  const todayStr = getLocalDateStr();

  const todayClassObservations = useMemo(() => {
    return observations.filter(
      (o) => o.classId === activeClassId && o.date === todayStr
    );
  }, [observations, activeClassId, todayStr]);

  // Map student ID to today's observations list
  const studentTodayObsMap = useMemo(() => {
    const map = new Map<string, typeof todayClassObservations>();
    for (const obs of todayClassObservations) {
      const list = map.get(obs.studentId) || [];
      list.push(obs);
      map.set(obs.studentId, list);
    }
    return map;
  }, [todayClassObservations]);

  // All students in the active class
  const filteredStudents = activeStudents;

  // Statistics for top bar
  const totalStudents = activeStudents.length;
  const absentCount = useMemo(() => {
    return activeStudents.filter((s) => 
      (studentTodayObsMap.get(s.id) || []).some((o) => o.type === 'absent')
    ).length;
  }, [activeStudents, studentTodayObsMap]);

  const noUniformCount = useMemo(() => {
    return activeStudents.filter((s) => 
      (studentTodayObsMap.get(s.id) || []).some((o) => o.type === 'no_uniform')
    ).length;
  }, [activeStudents, studentTodayObsMap]);

  const presentCount = Math.max(0, totalStudents - absentCount);

  return (
    <div id="mobile-field-container" className={`w-full min-h-screen flex flex-col relative pb-20 transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Mobile Status Header (Outdoors Optimized) */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b p-3.5 space-y-2.5 transition-colors ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'
      }`}>
        {/* Connection & Google Cloud Sync & Theme Indicators */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                !isOnline ? 'bg-rose-400' : authUser && cloudState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                !isOnline ? 'bg-rose-500' : authUser && cloudState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className={`text-xs font-bold flex items-center gap-1 truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">أوفلاين (حفظ محلي)</span>
                </>
              ) : authUser && cloudState === 'connected' ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Google Cloud</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">حفظ محلي</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <GoogleCloudSyncButton compact />

            {/* Quick theme button inside phone for outdoor sunlight toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl border text-[11px] flex items-center gap-1 transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title={isDark ? 'التبديل إلى الثيم الأبيض (مفيد تحت الشمس)' : 'التبديل إلى الثيم الأسود'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
              <span className="text-[10px] font-bold">{isDark ? 'أبيض' : 'أسود'}</span>
            </button>
          </div>
        </div>

        {/* Live Official Timetable Banner */}
        {scheduleStatus.activeSlot ? (
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isDark
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black text-emerald-500">حصتك الآن:</span>
                  <span className="text-xs font-black truncate">
                    {activeScheduledClass?.name || `${scheduleStatus.activeSlot.levelLabel} ${scheduleStatus.activeSlot.groupLabel}`}
                  </span>
                </div>
                <div className={`text-[10px] font-mono ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                  {scheduleStatus.activeSlot.dayLabelAr} • {scheduleStatus.activeSlot.startTime} - {scheduleStatus.activeSlot.endTime}
                  {scheduleStatus.remainingMinutes !== null && ` (متبقي ${scheduleStatus.remainingMinutes} د)`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeClassId !== scheduleStatus.activeSlot.classId && (
                <button
                  type="button"
                  onClick={() => {
                    followLiveSchedule();
                    setIsManualChooserOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                >
                  العودة لحصتي
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsManualChooserOpen((prev) => !prev)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-emerald-200 text-emerald-900'
                }`}
              >
                {isManualChooserOpen ? 'رجوع' : 'الأقسام'}
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-emerald-200 text-emerald-800'
                }`}
                title="عرض جدول الحصص الرسمي"
              >
                <CalendarClock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isDark
              ? 'bg-amber-950/30 border-amber-500/30 text-amber-100'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate flex items-center gap-1.5">
                  {!showNoSessionChooser && activeClass && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black shrink-0">
                      {activeClass.name}
                    </span>
                  )}
                  <span className="truncate">
                    لا توجد حصة حالياً ({scheduleStatus.currentDayLabelAr} {scheduleStatus.currentTimeStr})
                  </span>
                </div>
                {scheduleStatus.nextTodaySlot ? (
                  <button
                    type="button"
                    onClick={() => handleSelectClass(scheduleStatus.nextTodaySlot!.classId)}
                    className="text-[10px] font-bold text-amber-500 hover:underline text-right truncate block"
                  >
                    القادمة {scheduleStatus.nextTodaySlot.startTime}: {scheduleStatus.nextTodaySlot.levelLabel} {scheduleStatus.nextTodaySlot.groupLabel} ←
                  </button>
                ) : (
                  <span className={`text-[10px] ${isDark ? 'text-amber-300/70' : 'text-amber-700'}`}>
                    يمكنك اختيار أي قسم للمتابعة أو التعديل
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!showNoSessionChooser && (
                <button
                  type="button"
                  onClick={() => {
                    clearManualClassSelection();
                    setIsManualChooserOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black"
                >
                  الأقسام
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-amber-200 text-amber-900'
                }`}
                title="عرض جدول الحصص الرسمي"
              >
                <CalendarClock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Undo Notification for Fast Field Corrections */}
      {lastAddedObservation && (
        <div
          id="undo-toast-notification"
          className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200 border border-emerald-400/40 z-20"
        >
          <div className="flex items-center gap-2 text-xs overflow-hidden">
            <Check className="w-4 h-4 shrink-0 text-white" />
            <div className="truncate">
              <span className="font-bold">{lastAddedObservation.studentName}</span>: تم تسجيل{' '}
              <span className="underline font-black">
                {observationTypesConfig[lastAddedObservation.type]?.labelAr}
              </span>
            </div>
          </div>
          <button
            onClick={undoLastObservation}
            className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 active:scale-95 rounded-lg text-xs font-black shrink-0 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تراجع
          </button>
        </div>
      )}

      {/* Live Field Fast Action Tip OR No-Session Class Chooser */}
      {showNoSessionChooser ? (
        <div id="no-session-class-chooser" className="flex-1 p-3.5 space-y-3">
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                اختر القسم الذي تريد الانتقال إليه:
              </h2>
              <span className="text-[11px] font-mono text-amber-500 font-bold">
                {scheduleStatus.currentDayLabelAr} {scheduleStatus.currentTimeStr}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              لا توجد حصة مبرمجة في هذا التوقيت وفق جدول الحصص الرسمي. اضغط على أي قسم لعرض قائمة تلاميذه:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {classes.map((cls) => {
              const clsSlots = getSlotsForClass(cls.id);
              const isNextToday = scheduleStatus.nextTodaySlot?.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => handleSelectClass(cls.id)}
                  className={`p-3 rounded-2xl border text-right transition-all active:scale-[0.98] flex flex-col justify-between gap-2 ${
                    isNextToday
                      ? isDark
                        ? 'bg-emerald-950/50 border-emerald-500/60 hover:border-emerald-400'
                        : 'bg-emerald-50 border-emerald-400 hover:border-emerald-500 shadow-xs'
                      : isDark
                        ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50'
                        : 'bg-white border-slate-200 hover:border-emerald-400 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {cls.name}
                    </span>
                    <ArrowLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>

                  <div className="space-y-1 w-full">
                    {clsSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                      >
                        {slot.dayLabelAr}: {slot.startTime} - {slot.endTime}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between w-full pt-1 border-t border-slate-700/20">
                    <span className="text-[10px] font-bold text-emerald-500">
                      {cls.studentCount} تلميذ
                    </span>
                    {isNextToday && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                        الحصة القادمة
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Student Cards List (Directly visible at the top) */}
          <div className="flex-1 p-3 space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              isDark ? 'bg-slate-900 border border-slate-800 text-slate-500' : 'bg-white border border-slate-200 text-slate-400 shadow-sm'
            }`}>
              <Users className="w-7 h-7" />
            </div>
            <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>لا يوجد تلاميذ مطابقين للبحث</p>
            <p className="text-xs text-slate-500">تأكد من كتابة الاسم بدقة أو إلغاء الفلاتر المحددة</p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const todayObs = studentTodayObsMap.get(student.id) || [];
            const hasAbsent = todayObs.some((o) => o.type === 'absent');
            const hasNoUniform = todayObs.some((o) => o.type === 'no_uniform');

            return (
              <div
                key={student.id}
                id={`student-card-${student.id}`}
                onClick={() => setSelectedStudentForAction(student)}
                className={`p-3 rounded-2xl border transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-between ${
                  hasAbsent
                    ? isDark 
                      ? 'bg-red-950/30 border-red-500/40 hover:border-red-400' 
                      : 'bg-red-50/80 border-red-300 hover:border-red-400 shadow-xs'
                    : hasNoUniform
                    ? isDark 
                      ? 'bg-violet-950/30 border-violet-500/40 hover:border-violet-400' 
                      : 'bg-violet-50/80 border-violet-300 hover:border-violet-400 shadow-xs'
                    : todayObs.length > 0
                    ? isDark 
                      ? 'bg-slate-900/90 border-slate-700 hover:border-emerald-500/50' 
                      : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 shadow-xs'
                    : isDark 
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-600' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Right side: Number and Name */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                    hasAbsent
                      ? 'bg-red-600 text-white'
                      : hasNoUniform
                      ? 'bg-violet-600 text-white'
                      : isDark 
                        ? 'bg-slate-800 text-slate-200 border border-slate-700' 
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {student.studentNumber}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {student.firstName} {student.lastName}
                      </span>
                      {student.medicalStatus && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                          isDark ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-sky-100 text-sky-800 border-sky-200'
                        }`}>
                          معفى
                        </span>
                      )}
                    </div>

                    {/* Today's Badges */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {todayObs.length === 0 ? (
                        <span className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          حاضر ومستعد
                        </span>
                      ) : (
                        todayObs.map((obs) => {
                          const config = observationTypesConfig[obs.type];
                          return (
                            <span
                              key={obs.id}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${config.badgeColor}`}
                            >
                              <span>{config.labelAr}</span>
                              <span className="opacity-70 font-mono text-[9px]">{obs.time.slice(0, 5)}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Left side: Quick tap trigger */}
                <div className="flex items-center gap-1 pl-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-emerald-600 border-slate-200'
                  }`}>
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
          </div>
        </>
      )}

      {/* Quick Summary Sticky Bottom Bar for Teacher on the Pitch */}
      {!showNoSessionChooser && (
        <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-md border-t p-3 flex items-center justify-between text-xs z-30 shadow-2xl transition-colors ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-slate-200/50'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>حاضرون:</span>
              <span className="font-bold text-emerald-500 text-sm">{presentCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>غياب:</span>
              <span className="font-bold text-red-500 text-sm">{absentCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>دون بدلة:</span>
              <span className="font-bold text-violet-500 text-sm">{noUniformCount}</span>
            </div>
          </div>

          <div className={`text-[11px] font-mono px-2.5 py-1 rounded-md border ${
            isDark 
              ? 'text-slate-400 bg-slate-800 border-slate-700' 
              : 'text-slate-700 bg-slate-100 border-slate-300'
          }`}>
            المجموع: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalStudents}</span>
          </div>
        </div>
      )}

      {/* Official Timetable Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className={`w-full max-w-md max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-emerald-500" />
                <h3 className="font-black text-sm">جدول توزيع الحصص الرسمي</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {OFFICIAL_TIMETABLE.map((slot) => {
                const isNow = scheduleStatus.activeSlot?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      handleSelectClass(slot.classId);
                      setIsScheduleModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between gap-2 transition-colors ${
                      isNow
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : isDark
                          ? 'bg-slate-800/60 border-slate-700/60 hover:border-emerald-500/40'
                          : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">
                        {slot.levelLabel} {slot.groupLabel}
                        {isNow && (
                          <span className="mr-2 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px]">
                            الآن
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {slot.dayLabelAr} • {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rapid Action Popup (Modal) */}
      <QuickActionModal />
    </div>
  );
};
