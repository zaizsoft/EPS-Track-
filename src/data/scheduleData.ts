export interface ScheduleSlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday ... 6 = Saturday
  dayLabelAr: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  startMinutes: number;
  endMinutes: number;
  classId: string;
  levelLabel: string;
  groupLabel: string;
}

const ARABIC_DAYS: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function makeSlot(
  id: string,
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  startTime: string,
  endTime: string,
  classId: string,
  levelLabel: string,
  groupLabel: string
): ScheduleSlot {
  return {
    id,
    dayOfWeek,
    dayLabelAr: ARABIC_DAYS[dayOfWeek],
    startTime,
    endTime,
    startMinutes: toMinutes(startTime),
    endMinutes: toMinutes(endTime),
    classId,
    levelLabel,
    groupLabel,
  };
}

// جدول توزيع الحصص الرسمي - ابتدائية الشهيد بني العربي
export const OFFICIAL_TIMETABLE: ScheduleSlot[] = [
  // الأحد
  makeSlot('sun-1', 0, '08:00', '09:30', 'cls-4ap-a', 'السنة 4 ابتدائي', '(أ)'),
  makeSlot('sun-2', 0, '09:30', '10:30', 'cls-3ap-a', 'السنة 3 ابتدائي', '(أ)'),
  makeSlot('sun-3', 0, '10:30', '11:30', 'cls-3ap-b', 'السنة 3 ابتدائي', '(ب)'),
  makeSlot('sun-4', 0, '12:00', '13:00', 'cls-2ap-b', 'السنة 2 ابتدائي', '(ب)'),

  // الاثنين
  makeSlot('mon-1', 1, '09:30', '10:30', 'cls-2ap-a', 'السنة 2 ابتدائي', '(أ)'),
  makeSlot('mon-2', 1, '10:30', '12:00', 'cls-4ap-b', 'السنة 4 ابتدائي', '(ب)'),
  makeSlot('mon-3', 1, '13:00', '14:00', 'cls-1ap-a', 'السنة 1 ابتدائي', '(أ)'),
  makeSlot('mon-4', 1, '14:00', '15:00', 'cls-3ap-a', 'السنة 3 ابتدائي', '(أ)'),
  makeSlot('mon-5', 1, '16:00', '17:00', 'cls-1ap-b', 'السنة 1 ابتدائي', '(ب)'),

  // الأربعاء
  makeSlot('wed-1', 3, '12:00', '13:00', 'cls-2ap-b', 'السنة 2 ابتدائي', '(ب)'),
  makeSlot('wed-2', 3, '13:00', '14:00', 'cls-1ap-a', 'السنة 1 ابتدائي', '(أ)'),
  makeSlot('wed-3', 3, '14:00', '15:00', 'cls-2ap-a', 'السنة 2 ابتدائي', '(أ)'),
  makeSlot('wed-4', 3, '16:00', '17:00', 'cls-3ap-b', 'السنة 3 ابتدائي', '(ب)'),

  // الخميس
  makeSlot('thu-1', 4, '13:00', '14:00', 'cls-1ap-b', 'السنة 1 ابتدائي', '(ب)'),
  makeSlot('thu-2', 4, '14:00', '15:00', 'cls-5ap-a', 'السنة 5 ابتدائي', '(أ)'),
  makeSlot('thu-3', 4, '16:00', '17:00', 'cls-5ap-b', 'السنة 5 ابتدائي', '(ب)'),
];

export interface CurrentScheduleStatus {
  activeSlot: ScheduleSlot | null;
  remainingMinutes: number | null;
  nextTodaySlot: ScheduleSlot | null;
  todaySlots: ScheduleSlot[];
  currentDayLabelAr: string;
  currentTimeStr: string;
}

export function getCurrentScheduleStatus(now: Date = new Date()): CurrentScheduleStatus {
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDayLabelAr = ARABIC_DAYS[day] || '';
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todaySlots = OFFICIAL_TIMETABLE.filter((slot) => slot.dayOfWeek === day).sort(
    (a, b) => a.startMinutes - b.startMinutes
  );

  // Use [startMinutes, endMinutes) so boundary times like 09:30 cleanly start the next slot
  const activeSlot =
    todaySlots.find(
      (slot) => currentMinutes >= slot.startMinutes && currentMinutes < slot.endMinutes
    ) || null;

  const remainingMinutes = activeSlot ? activeSlot.endMinutes - currentMinutes : null;

  const nextTodaySlot =
    todaySlots.find((slot) => slot.startMinutes > currentMinutes) || null;

  return {
    activeSlot,
    remainingMinutes,
    nextTodaySlot,
    todaySlots,
    currentDayLabelAr,
    currentTimeStr,
  };
}

export function getSlotsForClass(classId: string): ScheduleSlot[] {
  return OFFICIAL_TIMETABLE.filter((s) => s.classId === classId);
}
