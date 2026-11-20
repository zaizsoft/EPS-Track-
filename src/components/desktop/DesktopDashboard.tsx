import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { observationTypesConfig } from '../../data/mockData';
import { ObservationType, Student } from '../../types';
import { ImportStudentsModal } from './ImportStudentsModal';
import { OfficialReportModal } from '../print/OfficialReportModal';
import { GoogleCloudSyncButton } from '../auth/GoogleCloudSyncButton';
import { getLocalDateStr } from '../../utils/date';
import { 
  Users, 
  UserX, 
  Clock, 
  Shirt, 
  PlusCircle, 
  MinusCircle, 
  Printer, 
  Upload, 
  Search, 
  Trash2, 
  RefreshCcw, 
  Radio, 
  TrendingUp, 
  CheckCircle,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  Plus,
  Sun,
  Moon
} from 'lucide-react';

export const DesktopDashboard: React.FC = () => {
  const {
    classes,
    students,
    observations,
    activeClassId,
    setActiveClassId,
    deleteObservation,
    addStudent,
    deleteStudent,
    teacherProfile,
    theme,
    toggleTheme,
    resetToDefaultData,
    authUser,
    isSyncing
  } = useApp();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'feed' | 'roster' | 'analytics'>('feed');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);

  // Filtered observations
  const filteredObservations = useMemo(() => {
    return observations.filter((obs) => {
      if (classFilter !== 'all' && obs.classId !== classFilter) return false;
      if (selectedTypeFilter !== 'all' && obs.type !== selectedTypeFilter) return false;
      if (dateFilter && obs.date !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = obs.studentName.toLowerCase().includes(q);
        const matchNum = obs.studentNumber.toString().includes(q);
        const matchNote = obs.noteText?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchNote) return false;
      }
      return true;
    });
  }, [observations, classFilter, selectedTypeFilter, dateFilter, searchQuery]);

  // Overall & today's live statistics
  const todayStr = getLocalDateStr();
  const totalStudentsCount = students.length;
  const totalAbsences = observations.filter((o) => o.type === 'absent').length;
  const todayAbsences = observations.filter((o) => o.type === 'absent' && o.date === todayStr).length;
  const totalDelays = observations.filter((o) => o.type === 'late').length;
  const todayDelays = observations.filter((o) => o.type === 'late' && o.date === todayStr).length;
  const totalNoUniform = observations.filter((o) => o.type === 'no_uniform').length;
  const todayNoUniform = observations.filter((o) => o.type === 'no_uniform' && o.date === todayStr).length;
  const totalPositive = observations.filter((o) => o.type === 'positive').length;
  const totalNegative = observations.filter((o) => o.type === 'negative').length;

  // Active class for roster view
  const currentClassForRoster = classes.find((c) => c.id === activeClassId) || classes[0];
  const classStudents = students
    .filter((s) => s.classId === activeClassId)
    .sort((a, b) => a.studentNumber - b.studentNumber);

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = ["الرقم", "اسم التلميذ", "القسم", "نوع الملاحظة", "التاريخ", "الوقت", "الموضوع", "الملاحظة الكتابية"];
    const rows = filteredObservations.map((obs) => [
      obs.studentNumber,
      `"${obs.studentName}"`,
      `"${obs.className}"`,
      `"${observationTypesConfig[obs.type]?.labelAr || obs.type}"`,
      obs.date,
      obs.time,
      `"${obs.sessionTopic || ''}"`,
      `"${(obs.noteText || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_التربية_البدنية_${getLocalDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const parts = newStudentName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '—';
    const nextNumber = classStudents.length > 0 ? Math.max(...classStudents.map((s) => s.studentNumber)) + 1 : 1;

    addStudent({
      classId: activeClassId,
      studentNumber: nextNumber,
      firstName,
      lastName,
      gender: newStudentGender
    });

    setNewStudentName('');
    setShowAddStudentForm(false);
  };

  return (
    <div id="desktop-dashboard-container" className={`w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 transition-colors ${
      isDark ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {/* Top Professional Header */}
      <header className={`border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/40'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>لوحة المتابعة المركزية لمادة التربية البدنية</h1>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                Web Dashboard
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {teacherProfile.name} • {teacherProfile.schoolName} ({teacherProfile.academicYear})
            </p>
          </div>
        </div>

        {/* Google Cloud Sync & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <GoogleCloudSyncButton />

          <button
            id="desktop-import-btn"
            onClick={() => setIsImportModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>استيراد قائمة (Excel / CSV)</span>
          </button>

          <button
            id="desktop-export-csv-btn"
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-500" />
            <span>تصدير Excel</span>
          </button>

          <button
            id="desktop-print-btn"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>كشف رسمي للطباعة (PDF)</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title={isDark ? 'التبديل إلى الثيم الأبيض' : 'التبديل إلى الثيم الأسود'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Refresh from Cloud or Reset Local Cache */}
          <button
            onClick={resetToDefaultData}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition-all ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700/80' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title={authUser ? 'مزامنة فورية من الخادم السحابي' : 'استعادة القوائم الأولية الافتراضية'}
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing && authUser ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Students */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>إجمالي التلاميذ</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalStudentsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">{classes.length} أقسام مفعلة</div>
        </div>

        {/* Absences */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-red-500/30' : 'bg-red-50/50 border-red-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-red-500 text-xs mb-1">
            <span>مجموع الغيابات</span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-red-300' : 'text-red-700'}`}>{totalAbsences}</div>
          <div className="text-[10px] text-red-500/80 mt-1">اليوم: {todayAbsences} • الإجمالي مسجل</div>
        </div>

        {/* Delays */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-amber-50/50 border-amber-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-amber-500 text-xs mb-1">
            <span>حالات التأخر</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{totalDelays}</div>
          <div className="text-[10px] text-amber-500/80 mt-1">اليوم: {todayDelays} • دخول متأخر</div>
        </div>

        {/* No Uniform */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-violet-500/30' : 'bg-violet-50/50 border-violet-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-violet-500 text-xs mb-1">
            <span>بدون بدلة</span>
            <Shirt className="w-4 h-4 text-violet-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-violet-300' : 'text-violet-800'}`}>{totalNoUniform}</div>
          <div className="text-[10px] text-violet-500/80 mt-1">اليوم: {todayNoUniform} • Sans Tenue</div>
        </div>

        {/* Positive Points */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-emerald-500 text-xs mb-1">
            <span>ملاحظات إيجابية</span>
            <PlusCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>+{totalPositive}</div>
          <div className="text-[10px] text-emerald-500/80 mt-1">مشاركة ونشاط</div>
        </div>

        {/* Negative Points */}
        <div className={`p-4 rounded-2xl shadow-sm border transition-colors ${
          isDark ? 'bg-slate-900/80 border-rose-500/30' : 'bg-rose-50/50 border-rose-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-rose-500 text-xs mb-1">
            <span>ملاحظات سلبية</span>
            <MinusCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>-{totalNegative}</div>
          <div className="text-[10px] text-rose-500/80 mt-1">انضباط وسلوك</div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'feed'
              ? 'bg-emerald-600 text-white shadow-md'
              : isDark
              ? 'bg-slate-800/80 text-slate-400 hover:text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>سجل الملاحظات اللحظي (Live Observations Feed)</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
            isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-white text-slate-700'
          }`}>
            {filteredObservations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-emerald-600 text-white shadow-md'
              : isDark
              ? 'bg-slate-800/80 text-slate-400 hover:text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>إدارة التلاميذ والأقسام (Roster & Directory)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-emerald-600 text-white shadow-md'
              : isDark
              ? 'bg-slate-800/80 text-slate-400 hover:text-white'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>تحليلات الانضباط والحضور (Analytics)</span>
        </button>
      </div>

      {/* Tab 1: Live Observations Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className={`border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Class Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>القسم:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">جميع الأقسام</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>النوع:</span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">كافة الملاحظات</option>
                  <option value="absent">غياب (Absent)</option>
                  <option value="late">تأخر (Retard)</option>
                  <option value="no_uniform">بدون بدلة (Sans Tenue)</option>
                  <option value="positive">إيجابي (+)</option>
                  <option value="negative">سلبي (-)</option>
                  <option value="dispensed">إعفاء طبي (Dispensé)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>التاريخ:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className={`text-[11px] ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الرقم، أو الملاحظة..."
                className={`w-full pl-3 pr-9 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-emerald-500 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Observations Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className={`font-bold border-b text-[11px] uppercase ${
                  isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3.5 pr-4">الرقم</th>
                    <th className="p-3.5">اسم التلميذ</th>
                    <th className="p-3.5">القسم</th>
                    <th className="p-3.5">نوع الملاحظة</th>
                    <th className="p-3.5">التاريخ والوقت</th>
                    <th className="p-3.5">موضوع الحصة</th>
                    <th className="p-3.5">التفاصيل / الملاحظة الميدانية</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {filteredObservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد ملاحظات مسجلة مطابقة للفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredObservations.map((obs) => {
                      const typeConfig = observationTypesConfig[obs.type] || {
                        labelAr: obs.type,
                        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
                      };
                      return (
                        <tr key={obs.id} className={`transition-colors ${
                          isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                          <td className={`p-3.5 pr-4 font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            #{obs.studentNumber}
                          </td>
                          <td className={`p-3.5 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {obs.studentName}
                          </td>
                          <td className="p-3.5 font-medium text-emerald-600">
                            {obs.className}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeConfig.badgeColor}`}>
                              <span>{typeConfig.labelAr}</span>
                              {typeConfig.pointImpact !== 0 && (
                                <span className="font-mono text-[10px] opacity-80">
                                  ({typeConfig.pointImpact > 0 ? `+${typeConfig.pointImpact}` : typeConfig.pointImpact})
                                </span>
                              )}
                            </span>
                          </td>
                          <td className={`p-3.5 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <div>{obs.date}</div>
                            <div className="text-[10px] opacity-75">{obs.time}</div>
                          </td>
                          <td className={`p-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {obs.sessionTopic || 'حصة عامة'}
                          </td>
                          <td className={`p-3.5 max-w-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {obs.noteText || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => deleteObservation(obs.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="حذف الملاحظة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Roster & Student Management */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-2xl shadow-sm ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setActiveClassId(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    cls.id === activeClassId
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cls.name} ({cls.studentCount})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تلميذ يدوياً</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>استيراد جماعي (Excel)</span>
              </button>
            </div>
          </div>

          {/* Add Student Quick Form */}
          {showAddStudentForm && (
            <form onSubmit={handleAddNewStudent} className={`p-4 border rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in ${
              isDark ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-300'
            }`}>
              <span className="text-xs font-bold text-emerald-600">إضافة تلميذ إلى {currentClassForRoster.name}:</span>
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="الاسم واللقب (مثال: رياض محرزي)..."
                className={`px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-64 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
                autoFocus
              />
              <select
                value={newStudentGender}
                onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')}
                className={`px-2 py-1.5 rounded-xl text-xs focus:outline-none border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="M">ذكر (M)</option>
                <option value="F">أنثى (F)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                حفظ التلميذ
              </button>
              <button
                type="button"
                onClick={() => setShowAddStudentForm(false)}
                className={`px-3 py-1.5 text-xs rounded-xl ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                إلغاء
              </button>
            </form>
          )}

          {/* Students Grid / Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>قائمة تلاميذ {currentClassForRoster.name}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {classStudents.length} تلميذ مسجل • {currentClassForRoster.grade}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className={`font-bold border-b ${
                  isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3 pr-4">الرقم في القائمة</th>
                    <th className="p-3">اللقب والاسم</th>
                    <th className="p-3">الجنس</th>
                    <th className="p-3">الوضعية الصحية</th>
                    <th className="p-3">مجموع الملاحظات</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {classStudents.map((student) => {
                    const studentObs = observations.filter((o) => o.studentId === student.id);
                    return (
                      <tr key={student.id} className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}>
                        <td className={`p-3 pr-4 font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          #{student.studentNumber}
                        </td>
                        <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.gender === 'F' 
                              ? isDark ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700'
                              : isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {student.gender === 'F' ? 'أنثى' : 'ذكر'}
                          </span>
                        </td>
                        <td className="p-3">
                          {student.medicalStatus ? (
                            <span className="text-sky-600 text-[11px] font-medium">{student.medicalStatus}</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">سليم</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {studentObs.length}
                            </span>
                            {studentObs.some((o) => o.type === 'absent') && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-600 font-bold">
                                غياب
                              </span>
                            )}
                            {studentObs.some((o) => o.type === 'no_uniform') && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-600 font-bold">
                                بدلة
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="حذف التلميذ من القائمة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Analytics & Class Comparisons */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Infraction breakdown by class */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>مقارنة الانضباط والغيابات بين الأقسام:</span>
              </h3>

              <div className="space-y-3">
                {classes.map((cls) => {
                  const classObs = observations.filter((o) => o.classId === cls.id);
                  const classAbs = classObs.filter((o) => o.type === 'absent').length;
                  const classNoTenue = classObs.filter((o) => o.type === 'no_uniform').length;
                  const classPos = classObs.filter((o) => o.type === 'positive').length;

                  return (
                    <div key={cls.id} className={`p-3 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{cls.name}</span>
                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{cls.studentCount} تلميذ</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className={`p-2 rounded-lg border text-center ${
                          isDark ? 'bg-red-950/40 border-red-500/30' : 'bg-red-50 border-red-200'
                        }`}>
                          <span className="text-red-500 text-[10px] block">غياب</span>
                          <span className={`font-black ${isDark ? 'text-red-200' : 'text-red-700'}`}>{classAbs}</span>
                        </div>
                        <div className={`p-2 rounded-lg border text-center ${
                          isDark ? 'bg-violet-950/40 border-violet-500/30' : 'bg-violet-50 border-violet-200'
                        }`}>
                          <span className="text-violet-500 text-[10px] block">بدون بدلة</span>
                          <span className={`font-black ${isDark ? 'text-violet-200' : 'text-violet-700'}`}>{classNoTenue}</span>
                        </div>
                        <div className={`p-2 rounded-lg border text-center ${
                          isDark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                        }`}>
                          <span className="text-emerald-500 text-[10px] block">مشاركات (+)</span>
                          <span className={`font-black ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>{classPos}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teaching field insights */}
            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>إرشادات بيداغوجية لمتابعة التربية البدنية:</span>
              </h3>

              <div className={`space-y-3 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>التسجيل اللحظي أثناء الإحماء:</strong> تسجيل الغياب وبدلة الرياضة في الدقائق الـ 5 الأولى يمنع تضييع وقت النشاط الحركي الفعلي.
                  </p>
                </div>
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>كشوفات الإدارة الرسمية:</strong> يمكن للأستاذ طباعة الكشف وتوقيعه وتقديمه للإدارة أو مستشار التربية بضغطة زر دون الحاجة لإعادة نقل الأسماء يدوياً.
                  </p>
                </div>
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>المزامنة السحابية غير المنقطعة:</strong> حتى عند ضعف تغطية شبكة 4G في الملعب أو الساحة، يحفظ التطبيق الملاحظات محلياً ثم يرفعها تلقائياً عند عودة الاتصال.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetClassId={activeClassId}
      />

      <OfficialReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        selectedClassId={activeClassId}
      />
    </div>
  );
};
