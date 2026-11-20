import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { QuickActionModal } from './QuickActionModal';
import { GoogleCloudSyncButton } from '../auth/GoogleCloudSyncButton';
import { observationTypesConfig } from '../../data/mockData';
import { Student } from '../../types';
import { getLocalDateStr } from '../../utils/date';
import { 
  Search, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Check, 
  Users, 
  Plus, 
  Sparkles,
  ChevronDown,
  UserCheck,
  AlertTriangle,
  Flame,
  ListFilter,
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
    activeSessionTopic,
    setActiveSessionTopic,
    isOnline,
    authUser,
    cloudState,
    lastAddedObservation,
    undoLastObservation,
    theme,
    toggleTheme
  } = useApp();

  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unmarked' | 'marked' | 'absent' | 'no_uniform'>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [tempTopic, setTempTopic] = useState(activeSessionTopic);

  // Filtered classes based on grade tab
  const filteredClasses = useMemo(() => {
    if (gradeFilter === 'all') return classes;
    return classes.filter((c) => c.name.includes(gradeFilter) || c.grade.includes(gradeFilter));
  }, [classes, gradeFilter]);

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

  // Filter students based on search and selected filter
  const filteredStudents = useMemo(() => {
    return activeStudents.filter((student) => {
      // Search match
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const numMatch = student.studentNumber.toString().includes(searchQuery.trim());
      const textMatch = fullName.includes(searchQuery.trim().toLowerCase());
      if (searchQuery.trim() && !numMatch && !textMatch) {
        return false;
      }

      const todayList = studentTodayObsMap.get(student.id) || [];
      const hasObs = todayList.length > 0;
      const isAbsent = todayList.some((o) => o.type === 'absent');
      const isNoUniform = todayList.some((o) => o.type === 'no_uniform');

      if (filterMode === 'marked') return hasObs;
      if (filterMode === 'unmarked') return !hasObs;
      if (filterMode === 'absent') return isAbsent;
      if (filterMode === 'no_uniform') return isNoUniform;

      return true;
    });
  }, [activeStudents, searchQuery, filterMode, studentTodayObsMap]);

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

        {/* Lesson Topic Banner */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
          isDark 
            ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500/30' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
        }`}>
          {!isEditingTopic ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <div className="truncate">
                <span className={`text-[11px] block font-medium ${isDark ? 'text-emerald-400/90' : 'text-emerald-800'}`}>
                  موضوع الحصة الحالية:
                </span>
                <span className={`text-sm font-bold truncate block ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>
                  {activeSessionTopic}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={tempTopic}
                onChange={(e) => setTempTopic(e.target.value)}
                className={`flex-1 px-2.5 py-1 text-xs rounded border focus:outline-none ${
                  isDark 
                    ? 'bg-slate-800 border-emerald-500/50 text-white' 
                    : 'bg-white border-emerald-500 text-slate-900'
                }`}
                placeholder="موضوع الحصة..."
              />
              <button
                onClick={() => {
                  if (tempTopic.trim()) setActiveSessionTopic(tempTopic.trim());
                  setIsEditingTopic(false);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-bold"
              >
                حفظ
              </button>
            </div>
          )}

          {!isEditingTopic && (
            <button
              onClick={() => {
                setTempTopic(activeSessionTopic);
                setIsEditingTopic(true);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-500 underline font-bold shrink-0 ml-2"
            >
              تعديل
            </button>
          )}
        </div>

        {/* Grade Level Quick Filter Bar (س1 - س5) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className={`text-[10px] font-bold px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>المستوى:</span>
          {(['all', '1', '2', '3', '4', '5'] as const).map((lvl) => {
            const isLvlActive = gradeFilter === lvl;
            const label = lvl === 'all' ? 'جميع السنوات' : `السنة ${lvl}`;
            return (
              <button
                key={lvl}
                onClick={() => setGradeFilter(lvl)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all shrink-0 ${
                  isLvlActive
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-200/80 text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Classes Horizontal Carousel Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filteredClasses.map((cls) => {
            const isSelected = cls.id === activeClassId;
            return (
              <button
                key={cls.id}
                id={`mobile-tab-${cls.id}`}
                onClick={() => setActiveClassId(cls.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 border border-emerald-500'
                    : isDark 
                      ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{cls.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected 
                    ? 'bg-emerald-800 text-emerald-100' 
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cls.studentCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Rapid Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-slate-400' : 'text-slate-400'
            }`} />
            <input
              id="mobile-student-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم التلميذ..."
              className={`w-full pl-3 pr-9 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors ${
                isDark 
                  ? 'bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400' 
                  : 'bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-medium scrollbar-none">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
              filterMode === 'all'
                ? isDark ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-slate-900 text-white font-bold'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({activeStudents.length})
          </button>
          <button
            onClick={() => setFilterMode('absent')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
              filterMode === 'absent'
                ? 'bg-red-500 text-white font-bold'
                : isDark ? 'bg-red-950/40 text-red-400 border border-red-900/40' : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            <span>غياب ({absentCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('no_uniform')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
              filterMode === 'no_uniform'
                ? 'bg-violet-500 text-white font-bold'
                : isDark ? 'bg-violet-950/40 text-violet-400 border border-violet-900/40' : 'bg-violet-100 text-violet-700 border border-violet-200'
            }`}
          >
            <span>بدون بدلة ({noUniformCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('marked')}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
              filterMode === 'marked'
                ? 'bg-emerald-500 text-white font-bold'
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            سُجل اليوم
          </button>
        </div>
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

      {/* Live Field Fast Action Tip */}
      <div className="px-3 pt-2 pb-1">
        <p className={`text-[11px] flex items-center gap-1 p-2 rounded-xl border ${
          isDark 
            ? 'bg-slate-900/60 border-slate-800/80 text-slate-400' 
            : 'bg-emerald-50/60 border-emerald-200/60 text-emerald-900'
        }`}>
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>المس اسم التلميذ لفتح <strong>الأزرار السريعة</strong> لتسجيل الغياب أو البدلة أو التقييم فوراً.</span>
        </p>
      </div>

      {/* Student Cards List */}
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

      {/* Quick Summary Sticky Bottom Bar for Teacher on the Pitch */}
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

      {/* Rapid Action Popup (Modal) */}
      <QuickActionModal />
    </div>
  );
};
